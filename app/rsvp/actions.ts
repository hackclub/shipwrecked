"use server";

import { opts } from "@/app/api/auth/[...nextauth]/route";
import { createRecord, getRecords } from "@/lib/airtable";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { headers } from 'next/headers';
import { z as zod } from "zod";

// The form schema for extra validation
const schema = z.object({
    "First Name": z.string().nonempty({
        message: "First Name cannot be empty",
    }),
    "Last Name": z.string().nonempty({
        message: "Last Name cannot be empty",
    }),
    Birthday: z.string().date("Birthday must be a valid date"),
    referral_code: z.coerce.number().optional().transform(val => val === 0 ? undefined : val),
    Email: z.string().email().optional(),
});

type SchemaType = z.infer<typeof schema>;

type Data = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

export type EntryData = Record<string, string | number | string[]>;

export type FormSave = {
    errors: Record<string, Array<string>> | undefined,
    data: EntryData | undefined,
    valid: boolean
};

// Check if the email is already RSVPed
async function isEmailRSVPed(email: string): Promise<boolean> {
    const records = await getRecords("RSVPs", {
        filterByFormula: `Email = '${email}'`,
        sort: [],
        maxRecords: 1,
    });
    return records.length > 0;
}

/**
 * Gets the client's IP address from the request headers
 */
async function getClientIP(): Promise<string> {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
        // Get the first IP in the list (client IP)
        return forwardedFor.split(',')[0].trim();
    }
    const realIP = headersList.get('x-real-ip');
    if (realIP) {
        return realIP;
    }
    return 'unknown';
}

/**
 * Parses the form fields and saves to airtable
 * If a session is found, use that, else use the payload email
 * 
 * @param state - The prev save state
 * @param payload - The form payload
 * @returns FormSave - The form output
 */
export async function save(state: FormSave, payload: FormData): Promise<FormSave> {
    try {
        // Get Session
        const session = await getServerSession(opts);

        // Get all of the schema keys and save the unparsed formdata according to the schema keys as field names
        const keys = Object.keys(schema.shape);

        const data: Data = {};
        keys.forEach((k: string) => (data[k] = payload.get(k) as string));

        // Validate form data
        const validated = await schema.safeParseAsync(data);

        // If Validation fails, return prematurely
        if (!validated.success) {
            const errors = validated.error.flatten().fieldErrors;
            return {
                errors: errors,
                data: undefined,
                valid: false
            };
        }

        // If the payload contains an email, parse it and save it to the validated scheme
        if (payload.get("Email")) {
            const email = await z.string().email().safeParseAsync(payload.get("Email"))

            if (!email.success) {
                return {
                    errors: { Email: ["Failure to parse email!"] },
                    data: undefined,
                    valid: false
                }
            }

            (validated.data as SchemaType)["Email"] = email.data
        }

        // Create a new Entry
        const newEntry: EntryData = { ...validated.data };
        
        // Only include referral_code if it's not null
        if (validated.data.referral_code === null) {
            delete newEntry.referral_code;
        }

        // If a session exists, use that email on the new entry
        if (session && session!.user && session!.user!.email)
            newEntry["Email"] = session!.user!.email!

        // If neither a session nor the form data contain an email, return prematurily
        if (!newEntry["Email"])
            return { errors: { Email: ["An email is required!"] }, data: undefined, valid: false }

        // Check if email is already RSVPed
        if (await isEmailRSVPed(newEntry["Email"] as string)) return {
            errors: { _form: ["This email is already RSVPed!"] },
            data: newEntry,
            valid: false
        }

        // Add IP address to the entry
        newEntry["IP Address"] = await getClientIP();

        try {
            // Create airtable record
            await createRecord("RSVPs", newEntry)
        } catch (error) {
            console.error("Error creating record in RSVPs:", error);
            return {
                errors: { _form: ["Unable to save your RSVP. Please try again later."] },
                data: undefined,
                valid: false
            };
        }

        return {
            errors: undefined,
            data: newEntry,
            valid: true
        };
    } catch (error) {
        console.error("Unexpected error in form submission:", error);
        return {
            errors: { _form: ["An unexpected error occurred. Please try again later."] },
            data: undefined,
            valid: false
        };
    }
}

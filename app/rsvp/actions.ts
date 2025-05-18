"use server";

import { opts } from "@/app/api/auth/[...nextauth]/route";
import { createRecord, getRecords } from "@/lib/airtable/index";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { headers } from 'next/headers';
import { z as zod } from "zod";
import metrics from "@/metrics";

// The form schema for extra validation
const schema = z.object({
    "First Name": z.string().nonempty({
        message: "First Name cannot be empty",
    }),
    "Last Name": z.string().nonempty({
        message: "Last Name cannot be empty",
    }),
    Birthday: z.string().date("Birthday must be a valid date"),
    referral_code: z.string().nullable().optional().transform(val => val === "0" ? undefined : Number(val)),
    referral_type: z.string().nullable(),
    Email: z.string().email().optional(),
});

type SchemaType = z.infer<typeof schema>;

type Data = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

export type EntryData = Record<string, string | number | string[] | null>;

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

function sanitizeEmail(email: string): string {
    return email.toLowerCase().replace(/[\s+']/g, '');
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
    console.log('=== RSVP Form Submission Start ===');
    console.log('Form Data:', Object.fromEntries(payload.entries()));
    
    try {
        // Get Session
        const session = await getServerSession(opts);
        console.log('Session:', session ? 'Found' : 'Not found');

        // Get all of the schema keys and save the unparsed formdata according to the schema keys as field names
        const keys = Object.keys(schema.shape);
        console.log('Schema keys:', keys);

        const data: Data = {};
        keys.forEach((k: string) => (data[k] = payload.get(k)));
        console.log('Parsed form data:', data);

        // Validate form data
        console.log('Validating form data...');
        const validated = await schema.safeParseAsync(data);
        console.log('Validation result:', validated.success ? 'Success' : 'Failed');

        // If Validation fails, return prematurely
        if (!validated.success) {
            console.log('Validation errors:', validated.error.flatten().fieldErrors);
            return {
                errors: validated.error.flatten().fieldErrors,
                data: undefined,
                valid: false
            };
        }

        // If the payload contains an email, parse it and save it to the validated scheme
        if (payload.get("Email")) {
            console.log('Validating email...');
            const email = await z.string().email().safeParseAsync(sanitizeEmail(payload.get("Email") as string))

            if (!email.success) {
                console.log('Email validation failed');
                return {
                    errors: { Email: ["Failure to parse email!"] },
                    data: undefined,
                    valid: false
                }
            }

            (validated.data as SchemaType)["Email"] = email.data
            console.log('Email validated successfully - ', email.data);
        }

        // Create a new Entry
        const newEntry: EntryData = { ...validated.data };
        console.log('Initial entry data:', newEntry);
        
        // Only include referral_code if it's not null
        if (validated.data.referral_code === null || validated.data.referral_code == 0) {
            console.log('Removing null referral_code');
            delete newEntry.referral_code;
        } else {
            validated.data.referral_code = Number(validated.data.referral_code);
        }
        // Add zerolen referral type when not provided
        if (!validated.data.referral_type) {
            console.log('Adding empty referral_type');
            validated.data.referral_type = "";
        }

        console.log('Final entry data:', newEntry);

        // If a session exists, use that email on the new entry
        if (session && session!.user && session!.user!.email) {
            console.log('Using session email:', session.user.email);
            newEntry["Email"] = session!.user!.email!
        }

        // If neither a session nor the form data contain an email, return prematurily
        if (!newEntry["Email"]) {
            console.log('No email found in session or form data');
            return { errors: { Email: ["An email is required!"] }, data: undefined, valid: false }
        }

        // Check if email is already RSVPed
        console.log('Checking if email is already RSVPed:', newEntry["Email"]);
        if (await isEmailRSVPed(newEntry["Email"] as string)) {
            console.log('Email already RSVPed');
            return {
                errors: { _form: ["This email is already RSVPed!"] },
                data: newEntry,
                valid: false
            }
        }

        // Add IP address to the entry
        const ip = await getClientIP();
        console.log('Adding IP address:', ip);
        newEntry["IP Address"] = ip;

        try {
            console.log('Creating Airtable record...');
            // Create airtable record
            metrics.increment("success.rsvp_save", 1);
            await createRecord("RSVPs", newEntry)
            console.log('Airtable record created successfully');
        } catch (error) {
            console.error("Error creating record in RSVPs:", error);
            metrics.increment("errors.rsvp_save", 1);
            return {
                errors: { _form: ["Unable to save your RSVP. Please try again later."] },
                data: undefined,
                valid: false
            };
        }

        console.log('=== RSVP Form Submission Success ===');
        metrics.increment("success.rsvp_form", 1);
        return {
            errors: undefined,
            data: newEntry,
            valid: true
        };
    } catch (error) {
        metrics.increment("errors.rsvp_form", 1);
        console.error("Unexpected error in form submission:", error);
        return {
            errors: { _form: ["An unexpected error occurred. Please try again later."] },
            data: undefined,
            valid: false
        };
    }
}

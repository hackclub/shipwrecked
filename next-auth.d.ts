// next-auth.d.ts
import NextAuth, { DefaultUser } from "next-auth";
import { UserStatus, UserRole } from "./app/generated/prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            slack?: string | null;
            hackatimeId?: string | null;
            role?: UserRole;
            isAdmin?: boolean;
            status?: UserStatus;
            emailVerified?: Date | null;
        },
        expires: string
    }

    // Extend the built-in User type
    interface User extends DefaultUser {
        slack?: string | null;
        hackatimeId?: string | null;
        role?: UserRole;
        isAdmin?: boolean;
        status?: UserStatus;
        emailVerified?: Date | null;
    }
}
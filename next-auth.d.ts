// next-auth.d.ts
import NextAuth, { DefaultUser } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            slack?: string | null;
            hackatimeId?: string | null;
        },
        expires: string
    }

    // Extend the built-in User type
    interface User extends DefaultUser {
        slack?: string | null;
        hackatimeId?: string | null;
    }
}
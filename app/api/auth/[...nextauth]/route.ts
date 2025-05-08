import NextAuth from "next-auth";
import SlackProvider from "next-auth/providers/slack";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { createTransport } from "nodemailer";


const adapter = {
  ...PrismaAdapter(prisma),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  linkAccount: async ({ ok, state, ...data }: any) => {
    console.log('Linking account:', { provider: data.provider, userId: data.userId });
    
    // If this is a Slack account, update the user with their Slack ID
    if (data.provider === 'slack') {
      console.log('Updating user with Slack ID from profile');
      await prisma.user.update({
        where: { id: data.userId },
        data: { 
          slack: data.providerAccountId  // Slack's user ID
        }
      });
    }

    const account = await prisma.account.create({
      data: {
        ...data,
        access_token: data.access_token ?? null,
        token_type: data.token_type ?? null,
        id_token: data.id_token ?? null,
        refresh_token: data.refresh_token ?? null,
        scope: data.scope ?? null,
        expires_at: data.expires_at ?? null,
        session_state: data.session_state ?? null,
      },
    });
    return void account;
  },
}

export const opts: NextAuthOptions = {
  adapter: adapter,
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID ?? "",
      clientSecret: process.env.SLACK_CLIENT_SECRET ?? ""
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER as string,
      from: process.env.EMAIL_FROM as string,
      maxAge: 60 * 10, // make email links valid for 10 minutes
      generateVerificationToken: () => {
        return Math.random().toString(36).substring(2, 15);
      },
      sendVerificationRequest: async ({ identifier: email, url, token, provider }) => {
        // Customize the verification email
        const { host } = new URL(url);
        const transport = await createTransport(provider.server);
        await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to Shipwrecked`,
          text: `Click here to sign in to Shipwrecked: ${url}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #47D1F6;">Welcome to Shipwrecked!</h1>
              <p>Click the button below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; background-color: #47D1F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Sign in to Shipwrecked
              </a>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `,
        });
      },
    })
  ],
  pages: {
    signIn: '/bay/login',
    verifyRequest: '/bay/login/verify',
    error: '/bay/login/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in
      if (account && user) {
        console.log('JWT Callback - Initial sign-in:', { userId: user.id, provider: account.provider });
        return {
          ...token,
          id: user.id
        };
      }

      // Subsequent calls
      console.log('JWT Callback - Reusing token:', { tokenId: token.id });
      return token;
    },
    async session({ session, token, user }) {
      // console.log('Session Callback - Input:', { 
      //   hasToken: !!token, 
      //   hasUser: !!user,
      //   sessionUser: session?.user 
      // });

      // We're using database sessions, so we should have a user
      if (user) {
        // console.log('Session Callback - Using database user:', { userId: user.id });
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id
          }
        };
      }

      // Fallback to JWT if needed
      if (token) {
        // console.log('Session Callback - Using JWT token:', { tokenId: token.id });
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id
          }
        };
      }

      console.log('Session Callback - No user or token found');
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/bay`;
    }
  },
  debug: false
}

const handler = NextAuth(opts)

export { handler as GET, handler as POST }

import NextAuth from "next-auth";
import SlackProvider from "next-auth/providers/slack";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { createTransport } from "nodemailer";
import { randomBytes } from "crypto";


const adapter = {
  ...PrismaAdapter(prisma),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  linkAccount: async ({ ok, state, ...data }: any) => {
    console.log('Linking account:', { provider: data.provider, userId: data.userId });
    
    // If this is a Slack account, update the user with their Slack ID
    if (data.provider === 'slack') {
      console.log('Updating user with Slack ID');
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
  session: {
    strategy: "database"
  },
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID ?? "",
      clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true // Allow linking accounts with same email
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER as string,
      from: process.env.EMAIL_FROM as string,
      maxAge: 60 * 10, // make email links valid for 10 minutes
      generateVerificationToken: async () => {
        // Generate a more secure token that matches NextAuth's expectations
        return new Promise((resolve, reject) => {
          randomBytes(32, (err, buf) => {
            if (err) reject(err);
            else resolve(buf.toString('hex'));
          });
        });
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
  callbacks: {
    async session({ session, user }) {
      // With database strategy, we get the fresh user data on every request
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          hackatimeId: user.hackatimeId
        }
      };
    },
    async signIn({ user, account, profile }) {
      // Log the sign in attempt
      console.log('Sign in attempt:', {
        email: user.email,
        provider: account?.provider,
        hasHackatimeId: !!user.hackatimeId
      });

      if (!user.email) {
        return false;
      }

      // If signing in with email, check if a Slack account exists
      if (account?.provider === 'email') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true }
        });

        if (existingUser) {
          // Update the current user with any existing hackatimeId
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              hackatimeId: existingUser.hackatimeId,
              slack: existingUser.slack
            }
          });
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/bay`;
    }
  },
  pages: {
    signIn: '/bay/login',
    verifyRequest: '/bay/login/verify',
    error: '/bay/login/error',
  },
  debug: true  // Temporarily enable debug mode to see what's happening
}

const handler = NextAuth(opts)

export { handler as GET, handler as POST }

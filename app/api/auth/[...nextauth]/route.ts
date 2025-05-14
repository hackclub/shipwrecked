import NextAuth from "next-auth";
import SlackProvider from "next-auth/providers/slack";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { randomBytes } from "crypto";
import metrics from "@/metrics";
import { sendEmailWithLoops } from "@/lib/loops";

const adapter = {
  ...PrismaAdapter(prisma),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  linkAccount: async ({ ok, state, ...data }: any) => {
    console.log('Linking account:', { provider: data.provider, userId: data.userId });
    
    // If this is a Slack account, update the user with their Slack ID
    if (data.provider === 'slack') {
      console.log('Updating user with Slack ID');

      try {
        await prisma.user.update({
          where: { id: data.userId },
          data: {
            slack: data.providerAccountId  // Slack's user ID
          }
        });
        metrics.increment("success.link_account_id", 1);
      } catch (err) {
        metrics.increment("errors.link_account_id", 1);
      }
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
        try {
          await sendEmailWithLoops(host, email, url);
          metrics.increment("success.send_auth_email", 1);
        } catch (err) {
          metrics.increment("errors.send_auth_email", 1);
        }
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
        metrics.increment("errors.sign_in", 1);
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

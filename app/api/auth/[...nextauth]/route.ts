import NextAuth from "next-auth";
import SlackProvider from "next-auth/providers/slack";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { randomBytes } from "crypto";
import metrics from "@/metrics";
import { sendAuthEmail, sendNotificationEmail } from "@/lib/loops";
import { AdapterUser } from "next-auth/adapters";

const adapter = {
  ...PrismaAdapter(prisma),
  // Custom createUser method to add auditing
  createUser: async (user: AdapterUser) => {
    console.log('Creating user:', user.email);
    
    try {
      // Create the user using Prisma
      const userCreated = await prisma.user.create({
        data: user
      });
      
      // Ensure we have a valid user with an ID before proceeding
      if (!userCreated || !userCreated.id) {
        console.error('User creation failed: no ID returned');
        throw new Error('User creation failed: no ID returned');
      }
      
      // Log the user creation event
      try {
        // Import dynamically to avoid circular imports
        const { logUserEvent, AuditLogEventType } = await import('@/lib/auditLogger');
        
        await logUserEvent({
          eventType: AuditLogEventType.UserCreated,
          description: `User account created with email ${user.email}`,
          targetUserId: userCreated.id,
          metadata: {
            provider: 'system',
            email: user.email,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('User creation audit log created successfully');
      } catch (error) {
        console.error('Failed to create audit log for user creation:', error);
        // Don't fail user creation if audit log fails
      }
      
      return userCreated;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Re-throw the error so NextAuth can handle it
    }
  },
  // Override updateUser to log when email is verified
  updateUser: async (user: { id: string; emailVerified?: Date | null } & Record<string, any>) => {
    console.log('Updating user:', user.id, 'with data:', JSON.stringify(user));
    
    // If emailVerified is being set and it's not null
    if (user.emailVerified) {
      try {
        // Get the user first to get their email for the audit log
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true }
        });
        
        if (existingUser) {
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: user
          });
          
          // Create audit log for email verification
          try {
            // Import dynamically to avoid circular imports
            const { logUserEvent, AuditLogEventType } = await import('@/lib/auditLogger');
            
            await logUserEvent({
              eventType: AuditLogEventType.UserVerified,
              description: `User verified email address: ${existingUser.email}`,
              targetUserId: user.id,
              metadata: {
                email: existingUser.email,
                verifiedAt: user.emailVerified instanceof Date 
                  ? user.emailVerified.toISOString() 
                  : new Date().toISOString()
              }
            });
            
            console.log('Email verification audit log created successfully');
          } catch (error) {
            console.error('Failed to create audit log for email verification:', error);
          }
          
          return updatedUser;
        }
      } catch (error) {
        console.error('Error in custom updateUser with verification:', error);
      }
    }
    
    // Fall back to default update behavior
    return prisma.user.update({
      where: { id: user.id },
      data: user
    });
  },
  // Add explicit verification token methods to fix the "in" operator error
  createVerificationToken: async (verificationToken: { identifier: string; expires: Date; token: string }) => {
    console.log('Creating verification token for:', verificationToken.identifier);
    try {
      const result = await prisma.verificationToken.create({
        data: verificationToken,
      });
      console.log('Verification token created successfully');
      return result;
    } catch (error) {
      console.error('Error creating verification token:', error);
      throw error;
    }
  },
  useVerificationToken: async ({ identifier, token }: { identifier: string; token: string }) => {
    console.log('Using verification token for:', identifier, 'with token:', token?.substring(0, 10) + '...');
    try {
      const verificationToken = await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token,
          },
        },
      });
      console.log('Verification token used and deleted successfully');
      return verificationToken;
    } catch (error) {
      console.error('Error using verification token:', error);
      // Return null if token not found or expired, which is expected behavior
      return null;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  linkAccount: async ({ ok, state, ...data }: any) => {
    console.log('Linking account:', { provider: data.provider, userId: data.userId });
    
    // If this is a Slack account, update the user with their Slack ID
    if (data.provider === 'slack') {
      console.log('Updating user with Slack ID');
      console.log('Slack data received:', { 
        providerAccountId: data.providerAccountId,
        profile: data.profile,
        userData: data
      });

      try {
        // Get existing user data to check if name is already set
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { name: true, email: true }
        });
        
        // Prepare update data with Slack user ID
        const updateData: any = {
          slack: data.providerAccountId  // Slack's user ID
        };
        
        // Extract name from ID token if available
        let userName = null;
        if (data.id_token) {
          try {
            // Decode the JWT token without verification (we just need the payload)
            const tokenParts = data.id_token.split('.');
            if (tokenParts.length >= 2) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              if (payload.name) {
                userName = payload.name;
                console.log('Extracted name from ID token:', userName);
              }
            }
          } catch (err) {
            console.error('Error extracting name from ID token:', err);
          }
        }
        
        // Use name from profile or ID token
        if (data.profile?.name || userName) {
          const nameToUse = data.profile?.name || userName;
          console.log('Setting user name from Slack:', nameToUse);
          updateData.name = nameToUse;
        }
        
        // Update the user with Slack ID and potentially name
        await prisma.user.update({
          where: { id: data.userId },
          data: updateData
        });
        
        // Create audit log for Slack connection
        try {
          // Import dynamically to avoid circular imports
          const { logUserEvent, AuditLogEventType } = await import('@/lib/auditLogger');
          
          await logUserEvent({
            eventType: AuditLogEventType.SlackConnected,
            description: `User connected Slack account`,
            targetUserId: data.userId,
            metadata: {
              provider: 'slack',
              slackId: data.providerAccountId,
              email: user?.email,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('Slack connection audit log created successfully');
        } catch (error) {
          console.error('Failed to create audit log for Slack connection:', error);
        }
        
        metrics.increment("success.link_account_id", 1);
      } catch (err) {
        console.error('Error updating user with Slack data:', err);
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
          const date = new Date();
          const datetime = `[${date.getDate()}/${date.getMonth()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}] `
          await sendAuthEmail(email, host, url, datetime);
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
      // Check if user is an island attendee
      const { isAttendee } = await import('@/lib/userTags');
      const isAttendeeFlag = await isAttendee(user.id);
      
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          hackatimeId: user.hackatimeId,
          role: user.role,
          isAdmin: user.isAdmin,
          status: user.status,
          emailVerified: user.emailVerified,
          isAttendee: isAttendeeFlag
        }
      };
    },
    async signIn({ user, account, profile }) {
      // Log the sign in attempt
      console.log('Sign in attempt:', {
        email: user.email,
        provider: account?.provider,
        hasHackatimeId: !!user.hackatimeId,
        isAdmin: user.isAdmin,
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
      // Check if the URL is a callback URL with slackConnected parameter
      if (url.includes('slackConnected=true')) {
        console.log('Redirecting to:', url);
        return url;
      }
      
      // Clear experience mode cookie on login so it gets reset based on user status
      // Note: We need to add a flag to clear this on the client side since we can't 
      // access cookies directly in the redirect callback
      return `${baseUrl}/bay?clearExperience=true`;
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

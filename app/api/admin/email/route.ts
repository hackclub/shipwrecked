//use sendNotificationEmail

import { sendNotificationEmail } from "@/lib/loops"
import { getUserByEmail, sendUserMessage, sendUserMessageWithToken } from "@/lib/slack";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const { to, name, content } = await req.json()
    const date = new Date().toISOString()
    let emailStatus = 'pending';
    let slackStatus = 'not sent';
    let slackError = null;

    // Send email
    try {
      await sendNotificationEmail(to, name, date, content)
      emailStatus = 'sent';
    } catch (e) {
      emailStatus = 'failed';
      console.error('Email send error:', e);
    }

    // Try to send Slack DM as admin (impersonation)
    try {
      const slackUser = await getUserByEmail(to);
      if (slackUser && slackUser.id) {
        // Find an admin user with a Slack OAuth token
        const adminAccount = await prisma.account.findFirst({
          where: {
            provider: 'slack',
            user: { isAdmin: true }
          },
          select: {
            access_token: true
          }
        });
        if (adminAccount?.access_token) {
          await sendUserMessageWithToken(slackUser.id, { text: content }, adminAccount.access_token);
          slackStatus = 'sent (as admin)';
        } else {
          // Fallback to bot token
          await sendUserMessage(slackUser.id, { text: content });
          slackStatus = 'sent (as bot)';
        }
      } else {
        slackStatus = 'user not found';
      }
    } catch (e) {
      slackStatus = 'failed';
      slackError = String(e);
    }

    return NextResponse.json({ message: 'Email/Slack process complete', emailStatus, slackStatus, slackError })
}
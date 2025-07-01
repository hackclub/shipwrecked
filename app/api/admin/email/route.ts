//use sendNotificationEmail

import { sendPersonalizedEmail } from "@/lib/loops"
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server"
import { opts } from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  //check if user is admin`
  const session = await getServerSession(opts)
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
    const { to, name, content, reviewer, slackId } = await req.json()
    let emailStatus = 'pending';
    const slackStatus = 'not sent';
    const slackError = null;

    const slackUser = await prisma.user.findUnique({
      where: {
        id: slackId
      }
    });
    
    // Send email
    try {
      await sendPersonalizedEmail(to, name, reviewer, slackUser?.slack, content)
      emailStatus = 'sent';
    } catch (e) {
      emailStatus = 'failed';
      console.error('Email send error:', e);
    }
    
    return NextResponse.json({ message: 'Email/Slack process complete', emailStatus, slackStatus, slackError })
}
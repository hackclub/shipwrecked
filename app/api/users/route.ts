import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opts } from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function GET() {

    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                image: true,
                createdAt: true,
                projects: {
                    include: {
                        hackatimeLinks: true,
                    },
                },
                purchasedProgressHours: true,
                totalShellsSpent: true,
                adminShellAdjustment: true,
            },
            orderBy: {
                createdAt: 'desc',
              },
        });
        console.log("users", users);
        return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
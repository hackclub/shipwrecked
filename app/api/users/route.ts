import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                image: true,
                createdAt: true,
                purchasedProgressHours: true,
                totalShellsSpent: true,
                projects: {
                    include: {
                        hackatimeLinks: true,
                    },
                },
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
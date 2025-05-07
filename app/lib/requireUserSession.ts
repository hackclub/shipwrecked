import { auth } from "@/lib/auth";

export async function requireUserSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.user;
} 
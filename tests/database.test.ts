import { expect, test } from 'bun:test';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '../app/generated/prisma/client';
import { createPrismaAdapter } from '../lib/prisma-adapter';

// Only runs against an explicitly provided disposable test database.
test.skipIf(!process.env.TEST_DATABASE_URL)(
  'Prisma 7 and the auth adapter persist users, sessions, and one-time tokens',
  async () => {
    const previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
    process.env.DATABASE_URL = previousUrl;
    const auth = PrismaAdapter(prisma);
    const email = `upgrade-${crypto.randomUUID()}@example.invalid`;
    const sessionToken = crypto.randomUUID();
    const token = crypto.randomUUID();
    let userId: string | undefined;
    try {
      const user = await auth.createUser!({ id: crypto.randomUUID(), email, emailVerified: null });
      userId = user.id;
      expect((await auth.getUserByEmail!(email))?.id).toBe(userId);
      await auth.createSession!({ sessionToken, userId, expires: new Date(Date.now() + 60_000) });
      expect((await auth.getSessionAndUser!(sessionToken))?.user.id).toBe(userId);
      await auth.createVerificationToken!({
        identifier: email,
        token,
        expires: new Date(Date.now() + 60_000),
      });
      expect((await auth.useVerificationToken!({ identifier: email, token }))?.token).toBe(token);
      expect(await auth.useVerificationToken!({ identifier: email, token })).toBeNull();
      await auth.deleteSession!(sessionToken);
      expect(await auth.getSessionAndUser!(sessionToken)).toBeNull();
    } finally {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await prisma.$disconnect();
    }
  },
);

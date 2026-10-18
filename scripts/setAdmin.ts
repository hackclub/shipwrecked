import { prisma } from '../lib/prisma';

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });
    console.log(`User ${user.email} has been set as an admin.`);
  } catch (error) {
    console.error('Error setting user as admin:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Get the email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address.');
  process.exit(1);
}

setAdmin(email);

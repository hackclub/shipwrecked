// This script will set a user as a Reviewer by their email address
import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address as a command line argument');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { 
        // Using a raw string value since the enum is defined in Prisma schema but might not be exported correctly
        role: 'Reviewer'
      },
    });
    console.log(`User ${user.name || user.email} (${user.id}) is now a Reviewer`);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 
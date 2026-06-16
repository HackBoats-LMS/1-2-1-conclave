import { prisma } from '../lib/prisma';

async function main() {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'akhil031215n@gmail.com' },
      update: { role: 'ADMIN', isApproved: true },
      create: { email: 'akhil031215n@gmail.com', role: 'ADMIN', isApproved: true },
    });
    console.log('Successfully made akhil031215n@gmail.com an admin:', user);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

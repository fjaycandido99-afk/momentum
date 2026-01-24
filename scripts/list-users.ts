import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, created_at: true },
    orderBy: { created_at: 'desc' },
    take: 20
  });

  console.log('Users in database:');
  users.forEach(u => {
    console.log(`- ${u.email} (${u.name || 'no name'}) - ${u.created_at}`);
  });

  if (users.length === 0) {
    console.log('No users found in database');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

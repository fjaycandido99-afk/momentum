import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'f699b103-0945-4a13-89d4-85d520a85baa';

  // Check user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      preferences: true
    }
  });

  console.log('User:', JSON.stringify(user, null, 2));

  // If no preferences, create them
  if (user && !user.preferences) {
    console.log('\nCreating default preferences...');
    const prefs = await prisma.userPreferences.create({
      data: {
        user_id: userId,
        user_type: 'professional',
        work_days: [1, 2, 3, 4, 5],
        guide_tone: 'calm',
      }
    });
    console.log('Created preferences:', prefs.id);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'fjaycandido99@gmail.com';
  const supabaseId = 'f699b103-0945-4a13-89d4-85d520a85baa';

  // Try to find by email first
  let user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true }
  });

  // If not found, try by Supabase ID (some setups use Supabase UID as Prisma ID)
  if (!user) {
    user = await prisma.user.findUnique({
      where: { id: supabaseId },
      include: { subscription: true }
    });
  }

  // If still not found, create the user
  if (!user) {
    console.log('User not found, creating...');
    user = await prisma.user.create({
      data: {
        id: supabaseId,
        email: email,
        name: 'Francis Andy Jay Supsupo',
      },
      include: { subscription: true }
    });
    console.log('Created user:', user.id);
  } else {
    console.log('Found user:', user.id, user.email);
  }

  // Upsert subscription to premium
  const subscription = await prisma.subscription.upsert({
    where: { user_id: user.id },
    update: {
      tier: 'premium',
      status: 'active',
      billing_period_start: new Date(),
      billing_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      user_id: user.id,
      tier: 'premium',
      status: 'active',
      billing_period_start: new Date(),
      billing_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }
  });

  console.log('✅ Premium subscription activated!');
  console.log('   User:', user.email);
  console.log('   Tier:', subscription.tier);
  console.log('   Status:', subscription.status);
  console.log('   Expires:', subscription.billing_period_end);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

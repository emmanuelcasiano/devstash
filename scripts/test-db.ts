import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });

  console.log(`Connected to database. Found ${itemTypes.length} system item types:`);
  for (const type of itemTypes) {
    console.log(`  - ${type.name} (${type.icon}, ${type.color})`);
  }

  const user = await prisma.user.findUnique({
    where: { email: "demo@devstash.io" },
    include: {
      collections: {
        orderBy: { name: "asc" },
        include: {
          items: {
            include: { item: { include: { itemType: true } } },
          },
        },
      },
    },
  });

  if (!user) {
    console.log("\nNo demo user found — run `npx prisma db seed` first.");
    return;
  }

  console.log(`\nDemo user: ${user.name} <${user.email}> (isPro: ${user.isPro})`);
  console.log(`Collections (${user.collections.length}):`);

  for (const collection of user.collections) {
    console.log(`\n  ${collection.name} — ${collection.description}`);
    for (const { item } of collection.items) {
      console.log(`    - [${item.itemType.name}] ${item.title}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Database connection test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

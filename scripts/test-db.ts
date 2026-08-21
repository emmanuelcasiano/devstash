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
}

main()
  .catch((e) => {
    console.error("Database connection test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Deletes every user except `demo@devstash.io`, along with all of their content.
 *
 * Items, collections, custom item types, OAuth accounts and sessions are removed
 * automatically by the `onDelete: Cascade` rules on their `userId` foreign keys.
 * Verification tokens (keyed by email, no FK) and tags orphaned by the deletion
 * are swept explicitly.
 *
 * Safe by default: prints what it would delete and exits. Pass `--yes` to apply.
 *
 *   npx tsx scripts/prune-users.ts          # dry run
 *   npx tsx scripts/prune-users.ts --yes    # actually delete
 *
 * Uses whatever `DATABASE_URL` points at — the target host is printed up front so
 * you can confirm it is the development branch and not production.
 */
const KEEP_EMAIL = "demo@devstash.io";

function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const apply = process.argv.includes("--yes");

  console.log(`Target database host: ${databaseHost()}`);
  console.log(`Keeping: ${KEEP_EMAIL}`);
  console.log(apply ? "Mode: APPLY\n" : "Mode: dry run (pass --yes to apply)\n");

  const keeper = await prisma.user.findUnique({ where: { email: KEEP_EMAIL } });
  if (!keeper) {
    console.error(
      `Aborting: no user with email ${KEEP_EMAIL} exists. Refusing to run so ` +
        `this cannot wipe every user in the database.`,
    );
    process.exit(1);
  }

  const doomedUsers = await prisma.user.findMany({
    where: { email: { not: KEEP_EMAIL } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (doomedUsers.length === 0) {
    console.log("No other users found. Nothing to do.");
    return;
  }

  const doomedIds = doomedUsers.map((user) => user.id);

  const [items, collections, customTypes, accounts, sessions, verificationTokens] =
    await Promise.all([
      prisma.item.count({ where: { userId: { in: doomedIds } } }),
      prisma.collection.count({ where: { userId: { in: doomedIds } } }),
      prisma.itemType.count({ where: { userId: { in: doomedIds } } }),
      prisma.account.count({ where: { userId: { in: doomedIds } } }),
      prisma.session.count({ where: { userId: { in: doomedIds } } }),
      prisma.verificationToken.count({
        where: { identifier: { not: KEEP_EMAIL } },
      }),
    ]);

  console.log(`Users to delete (${doomedUsers.length}):`);
  for (const user of doomedUsers) {
    console.log(`  - ${user.email}`);
  }
  console.log("\nRelated rows removed with them:");
  console.log(`  items:               ${items}`);
  console.log(`  collections:         ${collections}`);
  console.log(`  custom item types:   ${customTypes}`);
  console.log(`  oauth accounts:      ${accounts}`);
  console.log(`  sessions:            ${sessions}`);
  console.log(
    `  verification tokens: ${verificationTokens} (every token except ${KEEP_EMAIL}'s)`,
  );

  if (!apply) {
    console.log("\nDry run complete. Re-run with --yes to delete.");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const tokens = await tx.verificationToken.deleteMany({
      where: { identifier: { not: KEEP_EMAIL } },
    });

    // Cascades handle items, collections, item_collections, custom item types,
    // accounts and sessions.
    const users = await tx.user.deleteMany({
      where: { email: { not: KEEP_EMAIL } },
    });

    // Tags are shared, not user-owned; drop only the ones left with no items.
    const orphanTags = await tx.tag.deleteMany({
      where: { items: { none: {} } },
    });

    return {
      users: users.count,
      tokens: tokens.count,
      orphanTags: orphanTags.count,
    };
  });

  console.log("\nDeleted:");
  console.log(`  users:               ${result.users}`);
  console.log(`  verification tokens: ${result.tokens}`);
  console.log(`  orphaned tags:       ${result.orphanTags}`);

  const remaining = await prisma.user.findMany({ select: { email: true } });
  console.log(
    `\nRemaining users (${remaining.length}): ${remaining
      .map((user) => user.email)
      .join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error("prune-users failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

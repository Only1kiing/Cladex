/**
 * One-time setup script: promotes hellokiing247@gmail.com to super_admin.
 *
 * Usage (from the backend/ directory):
 *   npx ts-node scripts/promote-admin.ts
 *
 * Notes:
 * - Requires DATABASE_URL to be set (the backend .env file will be read automatically
 *   by Prisma Client).
 * - Safe to run multiple times. If the user does not exist yet, the script will
 *   exit with a non-zero status code and print an error.
 * - The role column is a plain String — valid values are "user", "admin", and
 *   "super_admin".
 */

import { PrismaClient } from "@prisma/client";

const TARGET_EMAIL = "hellokiing247@gmail.com";
const TARGET_ROLE = "super_admin";

async function main() {
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email: TARGET_EMAIL },
      select: { id: true, email: true, role: true },
    });

    if (!existing) {
      console.error(`User with email ${TARGET_EMAIL} was not found.`);
      console.error("Create the account first (sign up through the app), then re-run this script.");
      process.exit(1);
    }

    if (existing.role === TARGET_ROLE) {
      console.log(`User ${TARGET_EMAIL} is already ${TARGET_ROLE}. Nothing to do.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { email: TARGET_EMAIL },
      data: { role: TARGET_ROLE },
      select: { id: true, email: true, role: true },
    });

    console.log(`Promoted ${updated.email} -> ${updated.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("promote-admin failed:", err);
  process.exit(1);
});

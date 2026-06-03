import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureUser({
  email,
  password,
  role,
  name
}: {
  email: string;
  password: string;
  role: "ADMIN" | "MEMBER";
  name: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role || existing.name !== name) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role, name }
      });
      console.log(`${name} "${email}" updated to ${role}.`);
    }
    console.log(`${name} "${email}" already exists, skipping.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      plan: "FREE",
      role
    }
  });

  console.log(`${name} created: ${email} / ${password}`);
}

async function main() {
  await ensureUser({
    email: process.env.ADMIN_USER_EMAIL || "admin@example.com",
    password: process.env.ADMIN_USER_PASSWORD || "password123",
    role: "ADMIN",
    name: "Admin User"
  });

  await ensureUser({
    email: process.env.DEMO_USER_EMAIL || "demo@example.com",
    password: process.env.DEMO_USER_PASSWORD || "password123",
    role: "MEMBER",
    name: "Demo User"
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import bcrypt from "bcryptjs";
import { db } from "@/server/db";

async function ensureUser({
  email,
  password,
  role,
  name
}: {
  email?: string;
  password?: string;
  role: "ADMIN" | "MEMBER";
  name: string;
}) {
  if (!email || !password) {
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role || existing.name !== name) {
      await db.user.update({
        where: { id: existing.id },
        data: { role, name }
      });
    }
    return;
  }

  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role
    }
  });
}

export async function ensureDemoUser() {
  await Promise.all([
    ensureUser({
      email: process.env.ADMIN_USER_EMAIL,
      password: process.env.ADMIN_USER_PASSWORD,
      role: "ADMIN",
      name: "Admin User"
    }),
    ensureUser({
      email: process.env.DEMO_USER_EMAIL,
      password: process.env.DEMO_USER_PASSWORD,
      role: "MEMBER",
      name: "Demo User"
    })
  ]);
}

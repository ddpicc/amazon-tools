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

async function ensurePlanDefinitions() {
  await Promise.all([
    prisma.planDefinition.upsert({
      where: { code: "starter" },
      update: {
        displayName: "入门版",
        description: "适合刚开始监控少量竞品的卖家。",
        priceCents: 1900,
        currency: "CNY",
        interval: "MONTHLY",
        active: true,
        sortOrder: 10,
        maxProjects: 2,
        maxTrackedAsins: 20,
        maxOwnAsinsPerProject: 3,
        maxCompetitorAsinsPerProject: 20,
        canUseAdvancedAnalytics: false,
        canUseProductResearch: false
      },
      create: {
        code: "starter",
        displayName: "入门版",
        description: "适合刚开始监控少量竞品的卖家。",
        priceCents: 1900,
        currency: "CNY",
        interval: "MONTHLY",
        active: true,
        sortOrder: 10,
        maxProjects: 2,
        maxTrackedAsins: 20,
        maxOwnAsinsPerProject: 3,
        maxCompetitorAsinsPerProject: 20,
        canUseAdvancedAnalytics: false,
        canUseProductResearch: false
      }
    }),
    prisma.planDefinition.upsert({
      where: { code: "basic" },
      update: {
        displayName: "基础版",
        description: "适合需要同时监控多个项目和更多 ASIN 的团队。",
        priceCents: 4900,
        currency: "CNY",
        interval: "MONTHLY",
        active: true,
        sortOrder: 20,
        maxProjects: 5,
        maxTrackedAsins: 100,
        maxOwnAsinsPerProject: 3,
        maxCompetitorAsinsPerProject: 20,
        canUseAdvancedAnalytics: true,
        canUseProductResearch: false
      },
      create: {
        code: "basic",
        displayName: "基础版",
        description: "适合需要同时监控多个项目和更多 ASIN 的团队。",
        priceCents: 4900,
        currency: "CNY",
        interval: "MONTHLY",
        active: true,
        sortOrder: 20,
        maxProjects: 5,
        maxTrackedAsins: 100,
        maxOwnAsinsPerProject: 3,
        maxCompetitorAsinsPerProject: 20,
        canUseAdvancedAnalytics: true,
        canUseProductResearch: false
      }
    })
  ]);
}

async function main() {
  await ensurePlanDefinitions();

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

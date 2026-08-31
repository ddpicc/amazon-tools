import { BillingInterval, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ensureDefaultPlanDefinitions, getLegacyUserPlan } from "@/server/services/billing/catalog";

const patchSchema = z.object({
  planCode: z.string().trim().min(1),
  status: z.nativeEnum(SubscriptionStatus)
});

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureDefaultPlanDefinitions();

  const plan = await db.planDefinition.findUnique({
    where: { code: parsed.data.planCode },
    select: { id: true, code: true }
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const subscription = await db.userSubscription.upsert({
    where: { userId: user.id },
    update: {
      planId: plan.id,
      status: parsed.data.status,
      billingInterval: BillingInterval.MONTHLY,
      cancelAtPeriodEnd: parsed.data.status === SubscriptionStatus.SCHEDULED_DOWNGRADE
    },
    create: {
      userId: user.id,
      planId: plan.id,
      status: parsed.data.status,
      billingInterval: BillingInterval.MONTHLY,
      cancelAtPeriodEnd: parsed.data.status === SubscriptionStatus.SCHEDULED_DOWNGRADE
    },
    include: {
      plan: true
    }
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      plan: getLegacyUserPlan(plan.code)
    }
  });

  return NextResponse.json({ subscription });
}

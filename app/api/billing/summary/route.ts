import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBillingSummary } from "@/server/services/billing/get-billing-summary";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getBillingSummary(session.user.id);
  return NextResponse.json(summary);
}

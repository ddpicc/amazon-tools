import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { queryAsinMonitoringSubscriptions } from "@/server/sorftime/subscriptions";
import { normalizeMarketplace } from "@/server/sorftime/marketplaces";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const marketplace = normalizeMarketplace(searchParams.get("marketplace") || "US");

  try {
    const result = await queryAsinMonitoringSubscriptions(marketplace);

    return NextResponse.json({
      marketplace,
      apiName: result.apiName,
      source: result.source,
      requestConsumed: result.requestConsumed,
      requestLeft: result.requestLeft,
      items: result.data
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "ASIN subscription query failed"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { retryDueWebhookDeliveries } from "@/server/services/alert-notifications";

function isAuthorized(request: Request) {
  const secret = process.env.MONITORING_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return authHeader === `Bearer ${secret}` || cronHeader === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await retryDueWebhookDeliveries({
      limit: limit && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined
    });

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Notification retry run failed"
      },
      { status: 500 }
    );
  }
}

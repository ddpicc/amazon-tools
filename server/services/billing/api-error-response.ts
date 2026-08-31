import { NextResponse } from "next/server";
import { isBillingLimitError } from "@/server/services/billing/errors";

export function createApiErrorResponse(error: unknown, fallbackMessage: string, status = 400) {
  if (isBillingLimitError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage
    },
    { status }
  );
}

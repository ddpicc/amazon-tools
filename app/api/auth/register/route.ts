import { NextResponse } from "next/server";
import { registerUserWithVerificationCode } from "@/server/services/auth-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await registerUserWithVerificationCode(body);
    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "注册失败"
      },
      { status: 400 }
    );
  }
}

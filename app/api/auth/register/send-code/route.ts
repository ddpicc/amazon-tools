import { NextResponse } from "next/server";
import { sendRegisterVerificationCode } from "@/server/services/auth-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await sendRegisterVerificationCode(body);
    return NextResponse.json({
      ok: true,
      message: "验证码已发送，请查收邮箱"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "验证码发送失败"
      },
      { status: 400 }
    );
  }
}

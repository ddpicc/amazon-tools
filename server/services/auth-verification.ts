import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { sendEmailMessage } from "@/server/services/email-delivery";

const REGISTER_PURPOSE = "register";
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

const sendCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email()
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  code: z.string().trim().regex(/^\d{6}$/)
});

function getVerificationSecret() {
  return process.env.NEXTAUTH_SECRET || "development-secret";
}

function hashVerificationCode(email: string, purpose: string, code: string) {
  return crypto
    .createHash("sha256")
    .update(`${getVerificationSecret()}:${purpose}:${email}:${code}`)
    .digest("hex");
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildVerificationEmailHtml(code: string) {
  return `
    <!doctype html>
    <html lang="zh-CN">
      <body style="margin:0;padding:0;background:#09090b;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#09090b;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 20px;background:linear-gradient(135deg, rgba(245,158,11,0.16), rgba(24,24,27,1));">
                    <div style="font-size:12px;line-height:18px;letter-spacing:0.14em;text-transform:uppercase;color:#fbbf24;">Sellumio Verification</div>
                    <div style="margin-top:10px;font-size:28px;line-height:34px;font-weight:700;color:#fafafa;">邮箱验证码</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <div style="font-size:14px;line-height:24px;color:#d4d4d8;">你正在注册 Sellumio 账号。请输入下面的 6 位验证码，10 分钟内有效。</div>
                    <div style="margin-top:20px;border-radius:18px;border:1px solid #27272a;background:#111113;padding:22px 20px;text-align:center;">
                      <div style="font-size:32px;line-height:38px;font-weight:700;letter-spacing:0.28em;color:#fbbf24;">${code}</div>
                    </div>
                    <div style="margin-top:18px;font-size:13px;line-height:22px;color:#a1a1aa;">如果不是你本人操作，可以忽略这封邮件。</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendRegisterVerificationCode(input: unknown) {
  const parsed = sendCodeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("请输入有效邮箱");
  }

  const email = parsed.data.email;
  const [existingUser, latestCode] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.emailVerificationCode.findFirst({
      where: {
        email,
        purpose: REGISTER_PURPOSE,
        consumedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  if (existingUser) {
    throw new Error("该邮箱已经注册");
  }

  if (
    latestCode &&
    Date.now() - latestCode.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw new Error("验证码发送过于频繁，请稍后再试");
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  const verificationCode = await db.emailVerificationCode.create({
    data: {
      email,
      purpose: REGISTER_PURPOSE,
      codeHash: hashVerificationCode(email, REGISTER_PURPOSE, code),
      expiresAt
    }
  });

  try {
    await sendEmailMessage({
      to: email,
      subject: "Sellumio 注册验证码",
      text: `你的 Sellumio 注册验证码是 ${code}，10 分钟内有效。`,
      html: buildVerificationEmailHtml(code),
      senderType: "auth"
    });
  } catch (error) {
    await db.emailVerificationCode.delete({
      where: {
        id: verificationCode.id
      }
    });
    throw error;
  }
}

export async function registerUserWithVerificationCode(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("请完整填写注册信息");
  }

  const email = parsed.data.email;
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw new Error("该邮箱已经注册");
  }

  const codeHash = hashVerificationCode(email, REGISTER_PURPOSE, parsed.data.code);
  const verificationCode = await db.emailVerificationCode.findFirst({
    where: {
      email,
      purpose: REGISTER_PURPOSE,
      codeHash,
      consumedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!verificationCode) {
    throw new Error("验证码无效或已过期");
  }

  const name = parsed.data.name?.trim() || email.split("@")[0];
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await db.$transaction(async (tx) => {
    await tx.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { consumedAt: new Date() }
    });

    return tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.MEMBER
      }
    });
  });

  return {
    id: user.id,
    email,
    name,
    password: parsed.data.password
  };
}

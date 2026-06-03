import { Resend } from "resend";

type EmailSenderType = "default" | "auth" | "digest";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  senderType?: EmailSenderType;
};

function getEmailConfig() {
  return {
    provider: process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "resend",
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    defaultFromEmail: process.env.EMAIL_FROM?.trim() || "",
    defaultFromName: process.env.EMAIL_FROM_NAME?.trim() || "Sellumio",
    authFromEmail:
      process.env.AUTH_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "",
    authFromName:
      process.env.AUTH_EMAIL_FROM_NAME?.trim() ||
      process.env.EMAIL_FROM_NAME?.trim() ||
      "Sellumio",
    digestFromEmail:
      process.env.DIGEST_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "",
    digestFromName:
      process.env.DIGEST_EMAIL_FROM_NAME?.trim() ||
      process.env.EMAIL_FROM_NAME?.trim() ||
      "Sellumio"
  };
}

function buildFromAddress(fromEmail: string, fromName: string) {
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

function getResendClient(apiKey: string) {
  return new Resend(apiKey);
}

function resolveSender(senderType: EmailSenderType, config: ReturnType<typeof getEmailConfig>) {
  if (senderType === "auth") {
    return {
      fromEmail: config.authFromEmail,
      fromName: config.authFromName
    };
  }

  if (senderType === "digest") {
    return {
      fromEmail: config.digestFromEmail,
      fromName: config.digestFromName
    };
  }

  return {
    fromEmail: config.defaultFromEmail,
    fromName: config.defaultFromName
  };
}

async function sendWithResend(message: EmailMessage) {
  const config = getEmailConfig();
  const sender = resolveSender(message.senderType ?? "default", config);

  if (!config.resendApiKey) {
    throw new Error("Email provider is not configured: missing RESEND_API_KEY");
  }

  if (!sender.fromEmail) {
    throw new Error(
      `Email provider is not configured: missing sender email for ${message.senderType ?? "default"}`
    );
  }

  const resend = getResendClient(config.resendApiKey);
  const { error } = await resend.emails.send({
    from: buildFromAddress(sender.fromEmail, sender.fromName),
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html
  });

  if (error) {
    throw new Error(`Resend email delivery failed: ${error.message}`);
  }
}

export async function sendEmailMessage(message: EmailMessage) {
  const config = getEmailConfig();

  if (config.provider !== "resend") {
    throw new Error(`Unsupported email provider: ${config.provider}`);
  }

  await sendWithResend(message);
}

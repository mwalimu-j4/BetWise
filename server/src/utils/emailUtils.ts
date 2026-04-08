import nodemailer from "nodemailer";

function getRequiredEnv(
  name:
    | "EMAIL_HOST"
    | "EMAIL_PORT"
    | "EMAIL_USER"
    | "EMAIL_PASS"
    | "FRONTEND_URL",
) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: getRequiredEnv("EMAIL_HOST"),
    port: Number(getRequiredEnv("EMAIL_PORT")),
    secure: false,
    auth: {
      user: getRequiredEnv("EMAIL_USER"),
      pass: getRequiredEnv("EMAIL_PASS"),
    },
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = getRequiredEnv("FRONTEND_URL");
  const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `no-reply <${getRequiredEnv("EMAIL_USER")}>`,
    to: email,
    subject: "Reset your BetixPro password",
    text: `Use this link to reset your password. It expires in 15 minutes: ${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in 15 minutes:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function sendAdminLoginOtpEmail(args: {
  email: string;
  otpCode: string;
  expiresInMinutes: number;
}) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `no-reply <${getRequiredEnv("EMAIL_USER")}>`,
    to: args.email,
    subject: "Your BetixPro admin login verification code",
    text: `Use this one-time code to complete your admin login: ${args.otpCode}. It expires in ${args.expiresInMinutes} minutes.`,
    html: `<p>Use this one-time code to complete your admin login:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${args.otpCode}</p><p>This code expires in ${args.expiresInMinutes} minutes.</p>`,
  });
}

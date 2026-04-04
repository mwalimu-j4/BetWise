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
    subject: "Reset your BetWise password",
    text: `Use this link to reset your password. It expires in 15 minutes: ${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in 15 minutes:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

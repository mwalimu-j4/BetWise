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

function getOptionalBooleanEnv(name: "EMAIL_SECURE") {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return undefined;
}

function getTransporter() {
  const host = getRequiredEnv("EMAIL_HOST");
  const user = getRequiredEnv("EMAIL_USER");
  const pass = getRequiredEnv("EMAIL_PASS").trim();
  const port = Number(getRequiredEnv("EMAIL_PORT"));
  const secure = getOptionalBooleanEnv("EMAIL_SECURE") ?? port === 465;

  // Gmail SMTP in app-password mode uses a 16-character credential.
  if (host.toLowerCase() === "smtp.gmail.com" && pass.length !== 16) {
    throw new Error(
      "EMAIL_PASS looks invalid for Gmail SMTP. Use a 16-character Gmail app password.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = getRequiredEnv("FRONTEND_URL");
  const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `no-reply <${getRequiredEnv("EMAIL_USER")}>`,
    to: email,
    subject: "Reset your BetixPro password",
    text: `Use this link to reset your password. It expires in 15 minutes: ${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in 15 minutes:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  if (!info.accepted.includes(email) || info.rejected.length > 0) {
    throw new Error("Password reset email was not accepted by SMTP provider.");
  }
}

export async function sendMicrosoftAuthenticatorInstallEmail(email: string) {
  const transporter = getTransporter();
  const androidUrl =
    "https://play.google.com/store/apps/details?id=com.azure.authenticator";
  const iosUrl =
    "https://apps.apple.com/app/microsoft-authenticator/id983156458";
  const fallbackUrl =
    "https://www.microsoft.com/security/mobile-authenticator-app";

  const info = await transporter.sendMail({
    from: `no-reply <${getRequiredEnv("EMAIL_USER")}>`,
    to: email,
    subject: "Install Microsoft Authenticator for Admin 2FA",
    text: `Install Microsoft Authenticator on your phone:\n\nAndroid (Play Store): ${androidUrl}\niPhone (App Store): ${iosUrl}\n\nIf needed, use this page: ${fallbackUrl}`,
    html: `<p>Install <strong>Microsoft Authenticator</strong> on your phone:</p><ul><li><a href="${androidUrl}">Android (Play Store)</a></li><li><a href="${iosUrl}">iPhone (App Store)</a></li></ul><p>If needed, use this fallback page: <a href="${fallbackUrl}">${fallbackUrl}</a></p>`,
  });

  if (!info.accepted.includes(email) || info.rejected.length > 0) {
    throw new Error(
      "Authenticator app install email was not accepted by SMTP provider.",
    );
  }
}

export async function sendAdminLoginOtpEmail(args: {
  email: string;
  otpCode: string;
  expiresInMinutes: number;
}) {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `no-reply <${getRequiredEnv("EMAIL_USER")}>`,
    to: args.email,
    subject: "Your BetixPro admin login verification code",
    text: `Use this one-time code to complete your admin login: ${args.otpCode}. It expires in ${args.expiresInMinutes} minutes.`,
    html: `<p>Use this one-time code to complete your admin login:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${args.otpCode}</p><p>This code expires in ${args.expiresInMinutes} minutes.</p>`,
  });

  if (!info.accepted.includes(args.email) || info.rejected.length > 0) {
    throw new Error("Admin MFA email was not accepted by SMTP provider.");
  }
}

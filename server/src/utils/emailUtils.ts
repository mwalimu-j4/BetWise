import sgMail from "@sendgrid/mail";

function getRequiredEnv(name: "SENDGRID_API_KEY" | "FROM_EMAIL") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getDefaultFrom() {
  return {
    email: getRequiredEnv("FROM_EMAIL"),
    name: "Betixpro Support",
  };
}

async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  sgMail.setApiKey(getRequiredEnv("SENDGRID_API_KEY"));

  await sgMail.send({
    to: args.to,
    from: getDefaultFrom(),
    subject: args.subject,
    text: args.text,
    html: args.html,
    mailSettings: {
      sandboxMode: {
        enable: false,
      },
    },
    headers: {
      "X-Priority": "3",
      "X-Mailer": "Betixpro Mailer",
      "List-Unsubscribe": "<mailto:support@betixpro.com>",
    },
  });
}

export async function sendMicrosoftAuthenticatorInstallEmail(email: string) {
  const androidUrl =
    "https://play.google.com/store/apps/details?id=com.azure.authenticator";
  const iosUrl =
    "https://apps.apple.com/app/microsoft-authenticator/id983156458";
  const fallbackUrl =
    "https://www.microsoft.com/security/mobile-authenticator-app";

  await sendEmail({
    to: email,
    subject: "Install Microsoft Authenticator for Admin 2FA",
    text: `Install Microsoft Authenticator on your phone:\n\nAndroid (Play Store): ${androidUrl}\niPhone (App Store): ${iosUrl}\n\nIf needed, use this page: ${fallbackUrl}`,
    html: `<p>Install <strong>Microsoft Authenticator</strong> on your phone:</p><ul><li><a href="${androidUrl}">Android (Play Store)</a></li><li><a href="${iosUrl}">iPhone (App Store)</a></li></ul><p>If needed, use this fallback page: <a href="${fallbackUrl}">${fallbackUrl}</a></p>`,
  });
}

export async function sendAdminLoginOtpEmail(args: {
  email: string;
  otpCode: string;
  expiresInMinutes: number;
}) {
  await sendEmail({
    to: args.email,
    subject: "Your BetixPro admin login verification code",
    text: `Use this one-time code to complete your admin login: ${args.otpCode}. It expires in ${args.expiresInMinutes} minutes.`,
    html: `<p>Use this one-time code to complete your admin login:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${args.otpCode}</p><p>This code expires in ${args.expiresInMinutes} minutes.</p>`,
  });
}

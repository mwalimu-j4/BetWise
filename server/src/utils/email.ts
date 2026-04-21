import sgMail from "@sendgrid/mail";

const RESET_SUBJECT = "Reset your Betixpro password";

type SendGridErrorShape = {
  code?: number;
  response?: {
    body?: {
      errors?: Array<{
        message?: string;
        field?: string;
        help?: string;
      }>;
    };
  };
};

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

function getSendGridApiKey() {
  const rawValue = process.env.SENDGRID_API_KEY;
  if (!rawValue) {
    throw new Error("SENDGRID_API_KEY is required.");
  }

  return normalizeEnvValue(rawValue);
}

function getRequiredEnv(
  name: "SENDGRID_API_KEY" | "FROM_EMAIL" | "FRONTEND_URL",
) {
  if (name === "SENDGRID_API_KEY") {
    return getSendGridApiKey();
  }

  const rawValue = process.env[name];
  if (!rawValue) {
    throw new Error(`${name} is required.`);
  }

  const value = normalizeEnvValue(rawValue);
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function logSendGridConfigurationHealth() {
  const rawApiKey = process.env.SENDGRID_API_KEY;
  const normalizedApiKey = rawApiKey ? normalizeEnvValue(rawApiKey) : "";
  const fromEmail = process.env.FROM_EMAIL ? normalizeEnvValue(process.env.FROM_EMAIL) : "";
  const frontendUrl = process.env.FRONTEND_URL ? normalizeEnvValue(process.env.FRONTEND_URL) : "";

  const apiKeyLoaded = normalizedApiKey.length > 0;
  const hasSendGridPrefix = normalizedApiKey.startsWith("SG.");
  const hadWrappingQuotes =
    typeof rawApiKey === "string" && rawApiKey.trim() !== normalizedApiKey;

  console.info("[SendGrid] Configuration health", {
    apiKeyLoaded,
    hasSendGridPrefix,
    apiKeyLength: normalizedApiKey.length,
    apiKeyHadWrappingQuotes: hadWrappingQuotes,
    fromEmailLoaded: Boolean(fromEmail),
    frontendUrlLoaded: Boolean(frontendUrl),
  });

  if (!apiKeyLoaded) {
    console.error("[SendGrid] SENDGRID_API_KEY is missing. Password reset emails cannot be sent.");
  } else if (!hasSendGridPrefix) {
    console.warn("[SendGrid] SENDGRID_API_KEY does not start with 'SG.'. Verify the key in Render environment variables.");
  }
}

function logSendGridSendError(error: unknown, recipient: string) {
  const sendGridError = error as SendGridErrorShape;
  const firstError = sendGridError.response?.body?.errors?.[0];

  console.error("[SendGrid] Failed to send password reset email", {
    recipient,
    code: sendGridError.code,
    providerMessage: firstError?.message,
    providerField: firstError?.field,
    providerHelp: firstError?.help,
  });

  if (sendGridError.code === 401) {
    console.error(
      "[SendGrid] Unauthorized (401). Check SENDGRID_API_KEY in Render: it must be a valid active API key with Mail Send permission.",
    );
  }
}

function buildResetUrl(token: string) {
  const frontendUrl = getRequiredEnv("FRONTEND_URL").replace(/\/$/, "");
  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildResetEmailHtml(resetUrl: string) {
  return `
    <div style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0b1f3a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;border:1px solid #d9e4f2;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#0d2137,#1a3a6b);padding:24px 28px;">
                  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Betixpro Account Security</h1>
                  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:#d7e5f7;">Password reset request received</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#173257;">We received a request to reset your password. Use the button below to continue.</p>
                  <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#173257;"><strong>This link expires in 1 hour.</strong></p>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
                    <tr>
                      <td align="center" style="border-radius:10px;background:#f5c518;">
                        <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#0d2137;text-decoration:none;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#5e7494;">If the button does not work, copy and paste this URL into your browser:</p>
                  <p style="margin:0 0 18px 0;font-size:13px;line-height:1.5;color:#1a3a6b;word-break:break-word;">${resetUrl}</p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8daa;">If you did not request this, you can ignore this email and your password will stay unchanged.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  sgMail.setApiKey(getSendGridApiKey());

  const resetUrl = buildResetUrl(token);

  try {
    await sgMail.send({
      to: email,
      from: {
        email: getRequiredEnv("FROM_EMAIL"),
        name: "Betixpro Support",
      },
      subject: RESET_SUBJECT,
      text: `We received a request to reset your Betixpro password. This link expires in 1 hour: ${resetUrl}`,
      html: buildResetEmailHtml(resetUrl),
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
  } catch (error) {
    logSendGridSendError(error, email);
    throw error;
  }
}

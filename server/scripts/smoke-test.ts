/// <reference types="node" />

type JsonBody =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

type LoginResponse = {
  accessToken?: string;
  mfaRequired?: boolean;
  appealToken?: string;
  message?: string;
  user?: { id: string; email: string; phone: string; role: string };
};

const baseUrl = (
  process.env.API_BASE_URL?.trim() || "http://localhost:5000/api"
).replace(/\/$/, "");
const demoAdminPhone = process.env.DEMO_ADMIN_PHONE?.trim() || "+254700000001";
const demoAdminPassword =
  process.env.DEMO_ADMIN_PASSWORD?.trim() || "DemoAdmin@123";
const demoUserPhone = process.env.DEMO_USER_PHONE?.trim() || "+254710000011";
const demoUserPassword =
  process.env.DEMO_USER_PASSWORD?.trim() || "DemoUser@123";
const bannedUserPhone =
  process.env.DEMO_BANNED_PHONE?.trim() || "+254710000028";
const bannedUserPassword =
  process.env.DEMO_BANNED_PASSWORD?.trim() || "DemoUser@123";

function headers(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T = JsonBody>(
  path: string,
  init: RequestInit = {},
  token?: string,
  allowNonOk = false,
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers(token),
      ...(init.headers || {}),
    },
  });

  const raw = await response.text();
  let body: T;

  try {
    body = raw ? (JSON.parse(raw) as T) : (null as T);
  } catch {
    body = raw as T;
  }

  if (!response.ok && !allowNonOk) {
    throw new Error(
      `${init.method || "GET"} ${path} -> ${response.status}: ${raw || response.statusText}`,
    );
  }

  return { status: response.status, body };
}

async function login(phone: string, password: string) {
  const response = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

  if (response.body.mfaRequired) {
    throw new Error(
      `Admin MFA was triggered for ${phone}. Disable admin two-factor for the demo seed or supply a verified MFA flow.`,
    );
  }

  if (!response.body.accessToken) {
    throw new Error(`Login for ${phone} did not return an access token.`);
  }

  return response.body.accessToken;
}

async function step(name: string, action: () => Promise<void>) {
  process.stdout.write(`- ${name}... `);
  await action();
  console.log("ok");
}

async function main() {
  console.log(`Running smoke test against ${baseUrl}`);

  const adminToken = await login(demoAdminPhone, demoAdminPassword);
  const userToken = await login(demoUserPhone, demoUserPassword);
  const bannedLogin = await request<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        phone: bannedUserPhone,
        password: bannedUserPassword,
      }),
    },
    undefined,
    true,
  );

  if (!bannedLogin.body.appealToken) {
    throw new Error("Banned login did not return an appeal token.");
  }

  const appealToken = bannedLogin.body.appealToken;

  await step("health check", async () => {
    await request("/health");
  });

  await step("public event feed", async () => {
    await request("/user/events?limit=5");
  });

  await step("authenticated profile flow", async () => {
    await request("/auth/me", {}, userToken);
    await request("/profile", {}, userToken);
    await request("/profile/balance", {}, userToken);
    await request("/profile/transactions?limit=5", {}, userToken);
    await request("/payments/wallet/summary", {}, userToken);
    await request("/notifications", {}, userToken);
    await request("/my-bets?limit=5", {}, userToken);
    await request("/contact/my-messages", {}, userToken);
  });

  await step("admin dashboard flow", async () => {
    await request("/auth/me", {}, adminToken);
    await request("/admin/dashboard/summary", {}, adminToken);
    await request("/admin/users?limit=5", {}, adminToken);
    await request("/admin/payments?limit=5", {}, adminToken);
    await request("/admin/payments/stats", {}, adminToken);
    await request("/admin/settings", {}, adminToken);
    await request("/admin/risk/summary", {}, adminToken);
    await request("/admin/risk/alerts?limit=5", {}, adminToken);
    await request("/admin/contact?limit=5", {}, adminToken);
    await request("/admin/newsletter/subscribers?limit=5", {}, adminToken);
    await request("/admin/appeals?limit=5", {}, adminToken);
  });

  await step("public form submissions", async () => {
    const uniqueNewsletter = `smoke.${Date.now()}@betwise.demo`;

    await request("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: uniqueNewsletter }),
    });

    await request("/newsletter/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ email: uniqueNewsletter }),
    });

    await request("/contact", {
      method: "POST",
      body: JSON.stringify({
        subject: "Demo smoke test contact",
        message:
          "This contact entry is created by the smoke test to verify the public submission path.",
        fullName: "Smoke Test User",
        phone: "+254700123456",
      }),
    });

    await request("/appeals/public", {
      method: "POST",
      body: JSON.stringify({
        appealToken,
        appealText:
          "This is a smoke test appeal used to verify the public ban appeal submission flow.",
      }),
    });
  });

  console.log("Smoke test finished successfully.");
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exitCode = 1;
});

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import request from "supertest";
import {
  createCorsOptions,
  isRequestOriginAllowed,
  resolveAllowedOriginsFromEnv,
  validateCorsConfiguration,
} from "../config/cors";
import { errorHandler } from "../errorHandler";

type EnvSnapshot = Record<string, string | undefined>;

function applyEnv(nextEnv: Record<string, string | undefined>) {
  const keys = Object.keys(nextEnv);
  const snapshot: EnvSnapshot = {};

  for (const key of keys) {
    snapshot[key] = process.env[key];
    const value = nextEnv[key];
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return { keys, snapshot };
}

function restoreEnv(keys: string[], snapshot: EnvSnapshot) {
  for (const key of keys) {
    const previousValue = snapshot[key];
    if (typeof previousValue === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = previousValue;
    }
  }
}

function withEnvSync<T>(
  nextEnv: Record<string, string | undefined>,
  run: () => T,
): T {
  const { keys, snapshot } = applyEnv(nextEnv);

  try {
    return run();
  } finally {
    restoreEnv(keys, snapshot);
  }
}

async function withEnv<T>(
  nextEnv: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const { keys, snapshot } = applyEnv(nextEnv);

  try {
    return await run();
  } finally {
    restoreEnv(keys, snapshot);
  }
}

function createTestCorsApp() {
  const app = express();
  const corsOptions = createCorsOptions();

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
  app.use(express.json());
  app.post("/api/auth/login", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);

  return app;
}

test("allowed origins include production and localhost entries", () => {
  withEnvSync(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "development",
    },
    () => {
      const allowed = resolveAllowedOriginsFromEnv();
      assert.ok(allowed.includes("https://betixpro.com"));
      assert.ok(allowed.includes("https://www.betixpro.com"));
      assert.ok(allowed.includes("http://localhost:5173"));
      assert.ok(allowed.includes("http://localhost:3000"));
    },
  );
});

test("production-like runtime excludes localhost unless explicitly enabled", () => {
  withEnvSync(
    {
      CORS_ORIGINS: "https://betixpro.com,https://www.betixpro.com",
      FRONTEND_URL: undefined,
      NODE_ENV: "prod",
      ENABLE_LOCALHOST_CORS_IN_PRODUCTION: undefined,
    },
    () => {
      const allowed = resolveAllowedOriginsFromEnv();
      assert.ok(allowed.includes("https://betixpro.com"));
      assert.ok(allowed.includes("https://www.betixpro.com"));
      assert.equal(allowed.includes("http://localhost:5173"), false);
      assert.equal(allowed.includes("http://localhost:3000"), false);
    },
  );
});

test("production-like runtime can opt in localhost origins", () => {
  withEnvSync(
    {
      CORS_ORIGINS: "https://betixpro.com,https://www.betixpro.com",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
      ENABLE_LOCALHOST_CORS_IN_PRODUCTION: "true",
    },
    () => {
      const allowed = resolveAllowedOriginsFromEnv();
      assert.ok(allowed.includes("http://localhost:5173"));
      assert.ok(allowed.includes("http://localhost:3000"));
    },
  );
});

test("misconfigured production CORS_ORIGINS fails startup validation", () => {
  withEnvSync(
    {
      CORS_ORIGINS: "https://betixpro.com",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    () => {
      assert.throws(
        () => validateCorsConfiguration(),
        /missing required production origins/i,
      );
    },
  );
});

test("request origin validator accepts allowed origins and rejects unknown origins", () => {
  withEnvSync(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    () => {
      assert.equal(
        isRequestOriginAllowed("https://betixpro.com", undefined),
        true,
      );
      assert.equal(
        isRequestOriginAllowed("https://www.betixpro.com", undefined),
        true,
      );
      assert.equal(
        isRequestOriginAllowed("https://attacker.example", undefined),
        false,
      );
      assert.equal(isRequestOriginAllowed(undefined, undefined), true);
    },
  );
});

test("requests without Origin header are allowed for server-to-server paths", async () => {
  await withEnv(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    async () => {
      const app = createTestCorsApp();
      const response = await request(app)
        .post("/api/auth/login")
        .send({ phone: "0700000000", password: "password" });

      assert.equal(response.status, 200);
    },
  );
});

test("preflight OPTIONS succeeds for allowed production origins", async () => {
  await withEnv(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    async () => {
      const app = createTestCorsApp();

      for (const origin of [
        "https://betixpro.com",
        "https://www.betixpro.com",
      ]) {
        const response = await request(app)
          .options("/api/auth/login")
          .set("Origin", origin)
          .set("Access-Control-Request-Method", "POST")
          .set("Access-Control-Request-Headers", "Content-Type, Authorization");

        assert.equal(response.status, 204);
        assert.equal(response.headers["access-control-allow-origin"], origin);
      }
    },
  );
});

test("login endpoint CORS allows both production frontend origins", async () => {
  await withEnv(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    async () => {
      const app = createTestCorsApp();

      for (const origin of [
        "https://betixpro.com",
        "https://www.betixpro.com",
      ]) {
        const response = await request(app)
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({ phone: "0700000000", password: "password" });

        assert.equal(response.status, 200);
        assert.equal(response.headers["access-control-allow-origin"], origin);
      }
    },
  );
});

test("disallowed origin fails with 403 CORS policy response", async () => {
  await withEnv(
    {
      CORS_ORIGINS:
        "https://betixpro.com,https://www.betixpro.com,http://localhost:5173,http://localhost:3000",
      FRONTEND_URL: undefined,
      NODE_ENV: "production",
    },
    async () => {
      const app = createTestCorsApp();

      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://attacker.example")
        .send({ phone: "0700000000", password: "password" });

      assert.equal(response.status, 403);
      assert.match(
        String(response.body?.message ?? ""),
        /request origin is not allowed by cors policy/i,
      );
    },
  );
});

test("login route is not protected by authenticate middleware", async () => {
  const authRoutesPath = path.resolve(
    process.cwd(),
    "src/routes/auth.routes.ts",
  );
  const source = await fs.readFile(authRoutesPath, "utf8");

  const loginRouteLine = source
    .split("\n")
    .find((line) => line.includes('authRouter.post("/auth/login"'));

  assert.ok(loginRouteLine, "login route should exist");
  assert.ok(
    !loginRouteLine?.includes("authenticate"),
    "login route must remain public and bypass auth middleware",
  );
});

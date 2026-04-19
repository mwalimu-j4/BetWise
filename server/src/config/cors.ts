import type { CorsOptions } from "cors";

const REQUIRED_PRODUCTION_ORIGINS = [
  "https://betixpro.com",
  "https://www.betixpro.com",
];

const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"];

const PRODUCTION_LIKE_ENV_NAMES = new Set(["production", "prod"]);

function normalizeOrigin(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isTruthy(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

export function isProductionLikeRuntime() {
  const runtimeEnv = (process.env.NODE_ENV ?? "").trim().toLowerCase();
  return (
    PRODUCTION_LIKE_ENV_NAMES.has(runtimeEnv) ||
    isTruthy(process.env.VERCEL) ||
    isTruthy(process.env.RENDER) ||
    isTruthy(process.env.RAILWAY_ENVIRONMENT)
  );
}

function parseRawOrigins(raw: string | undefined) {
  if (!raw) {
    return [] as string[];
  }

  return unique(
    raw
      .split(",")
      .map((item) => normalizeOrigin(item))
      .filter((item): item is string => Boolean(item)),
  );
}

export function resolveAllowedOriginsFromEnv() {
  const fromCorsOrigins = parseRawOrigins(process.env.CORS_ORIGINS);
  const fromFrontendUrl = parseRawOrigins(process.env.FRONTEND_URL);
  const configured = unique([...fromCorsOrigins, ...fromFrontendUrl]);
  const includeDevOrigins =
    !isProductionLikeRuntime() ||
    isTruthy(process.env.ENABLE_LOCALHOST_CORS_IN_PRODUCTION);
  const baselineOrigins = includeDevOrigins
    ? [...REQUIRED_PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS]
    : [...REQUIRED_PRODUCTION_ORIGINS];

  return unique([...baselineOrigins, ...configured]);
}

export function validateCorsConfiguration() {
  const allowedOrigins = resolveAllowedOriginsFromEnv();
  const isProductionLike = isProductionLikeRuntime();
  const configuredCorsOrigins = parseRawOrigins(process.env.CORS_ORIGINS);

  if (isProductionLike && !(process.env.CORS_ORIGINS ?? "").trim()) {
    throw new Error(
      "CORS_ORIGINS must be set in production and include public frontend origins.",
    );
  }

  if (isProductionLike) {
    const missingRequiredOrigins = REQUIRED_PRODUCTION_ORIGINS.filter(
      (requiredOrigin) => !configuredCorsOrigins.includes(requiredOrigin),
    );

    if (missingRequiredOrigins.length > 0) {
      throw new Error(
        `CORS_ORIGINS is missing required production origins: ${missingRequiredOrigins.join(
          ", ",
        )}`,
      );
    }
  }

  return allowedOrigins;
}

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return resolveAllowedOriginsFromEnv().includes(normalizedOrigin);
}

export function isRequestOriginAllowed(
  originHeader: string | undefined,
  refererHeader: string | undefined,
) {
  if (!originHeader && !refererHeader) {
    return true;
  }

  const normalizedOrigin =
    (originHeader ? normalizeOrigin(originHeader) : null) ??
    (refererHeader ? normalizeOrigin(refererHeader) : null);

  if (!normalizedOrigin) {
    return false;
  }

  return resolveAllowedOriginsFromEnv().includes(normalizedOrigin);
}

export function createCorsOptions(): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.warn("[CORS] Rejected origin", {
        origin,
        allowedOrigins: resolveAllowedOriginsFromEnv(),
      });
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "X-CSRF-Token",
      "X-Requested-With",
    ],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
}

import type { CorsOptions } from "cors";

const REQUIRED_PRODUCTION_ORIGINS = [
  "https://betixpro.com",
  "https://www.betixpro.com",
];

const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"];

const DEFAULT_ALLOWED_ORIGINS = [
  ...REQUIRED_PRODUCTION_ORIGINS,
  ...DEVELOPMENT_ORIGINS,
];

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

  if (configured.length > 0) {
    return configured;
  }

  return DEFAULT_ALLOWED_ORIGINS;
}

export function validateCorsConfiguration() {
  const allowedOrigins = resolveAllowedOriginsFromEnv();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !(process.env.CORS_ORIGINS ?? "").trim()) {
    throw new Error(
      "CORS_ORIGINS must be set in production and include public frontend origins.",
    );
  }

  if (isProduction) {
    const missingRequiredOrigins = REQUIRED_PRODUCTION_ORIGINS.filter(
      (requiredOrigin) => !allowedOrigins.includes(requiredOrigin),
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
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    optionsSuccessStatus: 204,
  };
}

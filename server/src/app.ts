import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { errorHandler } from "./errorHandler";
import morgan from "morgan";
import { apiGlobalRateLimiter } from "./middleware/rateLimiter";
import { createCorsOptions, validateCorsConfiguration } from "./config/cors";

const app = express();
const allowedOrigins = validateCorsConfiguration();
const corsOptions = createCorsOptions();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(morgan("dev"));

console.info("[CORS] Allowlist configured", { allowedOrigins });

app.use((req, _res, next) => {
  const originHeader =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;

  if (originHeader) {
    console.info("[CORS] Incoming request origin", {
      method: req.method,
      path: req.originalUrl,
      origin: originHeader,
    });
  }

  if (req.method === "OPTIONS") {
    console.info("[CORS] Preflight request", {
      path: req.originalUrl,
      origin: originHeader,
      requestMethod: req.headers["access-control-request-method"],
      requestHeaders: req.headers["access-control-request-headers"],
    });
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());
app.use(
  express.json({
    limit: "100kb",
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody =
        Buffer.from(buffer);
    },
  }),
);

app.use("/api", apiGlobalRateLimiter, apiRouter);
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(errorHandler);

export { app };

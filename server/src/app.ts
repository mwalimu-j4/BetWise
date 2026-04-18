import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { errorHandler } from "./errorHandler";
import morgan from "morgan";
import { apiGlobalRateLimiter } from "./middleware/rateLimiter";

const app = express();
const configuredOrigins =
  process.env.CORS_ORIGINS ??
  process.env.FRONTEND_URL ??
  "http://localhost:5173";
const allowedOrigins = configuredOrigins
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = origin.trim().replace(/\/$/, "");
  return allowedOrigins.includes(normalizedOrigin);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.error("CORS BLOCKED ORIGIN", {
        origin,
        allowedOrigins,
      });
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  }),
);
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(
  express.json({
    limit: "100kb",
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: string }).rawBody =
        buffer.toString("utf8");
    },
  }),
);

app.use("/api", apiGlobalRateLimiter, apiRouter);
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(errorHandler);

export { app };

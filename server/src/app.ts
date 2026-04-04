import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { errorHandler } from "./errorHandler";
import morgan from "morgan";

const app = express();
const allowedOrigins = new Set([
  process.env.FRONTEND_URL ?? "http://localhost:5173",
  "http://localhost:3000",
  "https://betwise-95cj.onrender.com",
  "https://bet-wise1.vercel.app",
  ...(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  }),
);
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

export { app };

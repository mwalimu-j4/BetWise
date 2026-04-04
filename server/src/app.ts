import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { errorHandler } from "./errorHandler";

const app = express();
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

export { app };

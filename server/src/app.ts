import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { apiRouter } from "./routes";
import { errorHandler } from "./errorHandler";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use("/api", apiRouter);

app.use(errorHandler);

export { app };

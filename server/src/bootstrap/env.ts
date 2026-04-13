import { config } from "dotenv";

config({ override: process.env.NODE_ENV !== "production" });

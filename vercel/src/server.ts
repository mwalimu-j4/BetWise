import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { callbackRouter } from "./routes/callback";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "mpesa-callback" });
});

app.get("/", (req:Request, res:Response)=>{
    res.json({status:"okie dokie", service:"BetixPro MPESA SERVER"})
})
// M-Pesa callback routes
app.use("/api/mpesa", callbackRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err: unknown, req: Request, res: Response) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ M-Pesa Callback Server running on http://localhost:${PORT}`);
  console.log(
    `📍 Callback endpoint: http://localhost:${PORT}/api/mpesa/callback`,
  );
});

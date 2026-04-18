import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { callbackRouter } from "./routes/callback";
import validateEnv from "./utils/env_validator";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Validate environment variables
validateEnv()

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "mpesa-callback" });
});

app.get("/", (req: Request, res: Response) => {
  const uptime = process.uptime();

  res.json({
    status: "ok",
    service: "BetixPro MPESA SERVER",

    timestamp: new Date().toISOString(),
    uptime_seconds: uptime,

    environment: process.env.NODE_ENV || "development",

    server: {
      platform: process.platform,
      node_version: process.version,
    },
    config: {
      port: PORT,
    },
    developer: {
      name: "Dickens Omondi",
      github: "https://github.com/dikie001",
      linkedin: "www.linkedin.com/in/dickens-omondi-3a286b261",
    },
  });
});

app.get("/ui", (req: Request, res: Response) => {
  const uptime = process.uptime();

  const data = {
    status: "OK",
    service: "BetixPro MPESA SERVER",
    timestamp: new Date().toISOString(),
    uptime: uptime.toFixed(2),
    environment: process.env.NODE_ENV || "development",
    platform: process.platform,
    node: process.version,
    port: PORT,
    developer: {
      name: "Dickens Omondi",
      github: "https://github.com/dikie001",
      linkedin: "https://www.linkedin.com/in/dickens-omondi-3a286b261",
    },
  };

  res.send(`
  <html>
    <head>
      <title>MPESA NODE</title>
      <style>
        body {
          background: radial-gradient(circle at top, #020024, #000000);
          color: #00ffcc;
          font-family: monospace;
          margin: 0;
          padding: 20px;
        }

        .container {
          max-width: 900px;
          margin: auto;
          border: 1px solid #00ffcc;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 0 25px #00ffcc44;
        }

        h1 {
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 2px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .card {
          border: 1px solid #00ffcc;
          padding: 15px;
          border-radius: 8px;
          background: #000000aa;
        }

        .label {
          color: #00ffaa;
          font-size: 12px;
        }

        .value {
          font-size: 14px;
          margin-top: 5px;
          word-break: break-all;
        }

        .status {
          text-align: center;
          font-size: 18px;
          margin-bottom: 20px;
          color: #00ff88;
        }

        a {
          color: #00ffcc;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          opacity: 0.7;
        }

        .pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      </style>
    </head>

    <body>
      <div class="container">
        <h1>⚡ MPESA CORE NODE ⚡</h1>

        <div class="status pulse">SYSTEM ${data.status}</div>

        <div class="grid">
          <div class="card">
            <div class="label">SERVICE</div>
            <div class="value">${data.service}</div>
          </div>

          <div class="card">
            <div class="label">ENVIRONMENT</div>
            <div class="value">${data.environment}</div>
          </div>

          <div class="card">
            <div class="label">TIMESTAMP</div>
            <div class="value">${data.timestamp}</div>
          </div>

          <div class="card">
            <div class="label">UPTIME (s)</div>
            <div class="value">${data.uptime}</div>
          </div>

          <div class="card">
            <div class="label">PLATFORM</div>
            <div class="value">${data.platform}</div>
          </div>

          <div class="card">
            <div class="label">NODE VERSION</div>
            <div class="value">${data.node}</div>
          </div>

          <div class="card">
            <div class="label">PORT</div>
            <div class="value">${data.port}</div>
          </div>
        </div>

        <div class="card" style="margin-top:20px;">
          <div class="label">DEVELOPER</div>
          <div class="value">
            ${data.developer.name}<br/>
            GitHub: <a href="${data.developer.github}" target="_blank">${data.developer.github}</a><br/>
            LinkedIn: <a href="${data.developer.linkedin}" target="_blank">${data.developer.linkedin}</a>
          </div>
        </div>

        <div class="footer">
          > Awaiting Safaricom callbacks...<br/>
          > System stable
        </div>
      </div>
    </body>
  </html>
  `);
});


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
  console.log(` M-Pesa Callback Server running on http://localhost:${PORT}`);
  console.log(
    ` Callback endpoint: http://localhost:${PORT}/api/mpesa/callback`,
  );
});

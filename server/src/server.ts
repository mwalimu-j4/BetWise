import { config } from "dotenv";
config({ path: "./.env", override: true });
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { createHttpServerWithSockets } from "./lib/socket";

const port = Number(process.env.PORT ?? 5000);

async function startServer() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connected successfully.");

    const server = createHttpServerWithSockets(app);

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database connection failed. Server not started.", error);
    process.exit(1);
  }
}

void startServer();

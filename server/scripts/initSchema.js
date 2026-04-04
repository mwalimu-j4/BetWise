import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.resolve(__dirname, "../sql/schema");

export async function initializeSchema() {
  const entries = await fs.readdir(schemaDir);
  const sqlFiles = entries.filter((entry) => entry.endsWith(".sql")).sort();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const file of sqlFiles) {
      const filePath = path.join(schemaDir, file);
      let sql = await fs.readFile(filePath, "utf8");

      if (sql.includes("__USERS_ID_TYPE__")) {
        const typeResult = await client.query(
          `
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'id'
            LIMIT 1
          `,
        );

        const column = typeResult.rows[0];
        const usersIdType =
          column?.data_type === "uuid" || column?.udt_name === "uuid"
            ? "UUID"
            : "INT";

        sql = sql.replaceAll("__USERS_ID_TYPE__", usersIdType);
      }

      if (sql.trim()) {
        await client.query(sql);
      }
    }
    await client.query("COMMIT");
    return sqlFiles.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv.includes("--run")) {
  initializeSchema()
    .then((count) => {
      console.log(`Schema initialized from ${count} files.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema initialization failed", error);
      process.exit(1);
    });
}

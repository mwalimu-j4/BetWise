const { spawnSync } = require("node:child_process");
const FAILED_MIGRATION = "20260416130323_replace_custom_events_full_system";

function runPrismaResolve() {
  return spawnSync(
    `pnpm exec prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`,
    {
      stdio: "pipe",
      encoding: "utf8",
      shell: true,
    },
  );
}

const result = runPrismaResolve();
if (result.error) {
  process.stderr.write(String(result.error));
  process.exit(1);
}

const output = `${result.stdout || ""}${result.stderr || ""}`;

if (result.status === 0) {
  process.stdout.write(output);
  process.stdout.write(
    `[prisma-resolve] Rolled back failed migration marker: ${FAILED_MIGRATION}\n`,
  );
  process.exit(0);
}

// If migration is not marked failed (or not present), continue deploy.
if (
  /P3011|P3012|could not be found|No migration found|not in a failed state|without migrations table|_prisma_migrations/i.test(
    output,
  )
) {
  process.stdout.write(output);
  process.stdout.write(
    `[prisma-resolve] No failed marker to resolve for ${FAILED_MIGRATION}; continuing.\n`,
  );
  process.exit(0);
}

// Unknown Prisma failure should stop deploy.
process.stderr.write(output);
process.stderr.write(
  `[prisma-resolve] Failed to resolve migration ${FAILED_MIGRATION}.\n`,
);
process.exit(result.status || 1);

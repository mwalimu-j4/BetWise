const { spawnSync } = require("node:child_process");

function runCommand(command) {
  return spawnSync(command, {
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
}

function getFailedMigrations() {
  const status = runCommand("pnpm exec prisma migrate status");
  const statusOutput = `${status.stdout || ""}${status.stderr || ""}`;

  // No failures to resolve.
  if (status.status === 0) {
    process.stdout.write(statusOutput);
    process.stdout.write("[prisma-resolve] No failed migrations detected.\n");
    return [];
  }

  // If migrations table does not exist yet, there is nothing to resolve.
  if (
    /without migrations table|_prisma_migrations|No migration found/i.test(
      statusOutput,
    )
  ) {
    process.stdout.write(statusOutput);
    process.stdout.write(
      "[prisma-resolve] Migrations table not ready yet; continuing.\n",
    );
    return [];
  }

  const failed = Array.from(
    statusOutput.matchAll(/^\s*(\d{14}_[A-Za-z0-9_]+)\s*$/gm),
  ).map((m) => m[1]);

  if (failed.length === 0) {
    process.stderr.write(statusOutput);
    process.stderr.write(
      "[prisma-resolve] Unable to parse failed migrations from Prisma status output.\n",
    );
    process.exit(status.status || 1);
  }

  return failed;
}

function resolveFailedMigration(migrationId) {
  const result = runCommand(
    `pnpm exec prisma migrate resolve --rolled-back ${migrationId}`,
  );

  if (result.error) {
    process.stderr.write(String(result.error));
    process.exit(1);
  }

  const output = `${result.stdout || ""}${result.stderr || ""}`;

  if (result.status === 0) {
    process.stdout.write(output);
    process.stdout.write(
      `[prisma-resolve] Rolled back failed migration marker: ${migrationId}\n`,
    );
    return;
  }

  // If migration is not marked failed (or not present), continue deploy.
  if (
    /P3011|P3012|could not be found|No migration found|not in a failed state|without migrations table|_prisma_migrations/i.test(
      output,
    )
  ) {
    process.stdout.write(output);
    process.stdout.write(
      `[prisma-resolve] No failed marker to resolve for ${migrationId}; continuing.\n`,
    );
    return;
  }

  // Unknown Prisma failure should stop deploy.
  process.stderr.write(output);
  process.stderr.write(
    `[prisma-resolve] Failed to resolve migration ${migrationId}.\n`,
  );
  process.exit(result.status || 1);
}

const failedMigrations = getFailedMigrations();
for (const migrationId of failedMigrations) {
  resolveFailedMigration(migrationId);
}

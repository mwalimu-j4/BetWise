const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = process.cwd();
const nodeModules = path.join(root, "node_modules");
const linkPath = path.join(nodeModules, ".prisma");

function findPnPmPrismaDir() {
  const pnpmDir = path.join(nodeModules, ".pnpm");
  if (!fs.existsSync(pnpmDir)) return null;

  const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name.startsWith("@prisma+client@"));

  // Sort by version, preferring v6 first
  matches.sort((a, b) => {
    const aIsV6 = a.name.startsWith("@prisma+client@6.");
    const bIsV6 = b.name.startsWith("@prisma+client@6.");
    if (aIsV6 && !bIsV6) return -1;
    if (!aIsV6 && bIsV6) return 1;
    return b.name.localeCompare(a.name); // newer versions first
  });

  // Check each candidate for the .prisma directory
  for (const candidate of matches) {
    const target = path.join(
      pnpmDir,
      candidate.name,
      "node_modules",
      ".prisma",
    );
    if (fs.existsSync(target)) {
      return target;
    }
  }

  return null;
}

function ensurePrismaLink() {
  if (fs.existsSync(linkPath)) {
    console.log("[prisma-link] node_modules/.prisma already exists");
    return;
  }

  let target = findPnPmPrismaDir();
  if (!target) {
    console.log(
      "[prisma-link] generated client not found, running prisma generate...",
    );
    execSync("pnpm prisma generate", { stdio: "inherit", cwd: root });
    target = findPnPmPrismaDir();
  }

  if (!target) {
    console.error(
      "[prisma-link] Could not find Prisma generated client directory.",
    );
    process.exit(1);
  }

  // Create a directory symlink/junction so @prisma/client can resolve .prisma/client/default.
  fs.symlinkSync(target, linkPath, "junction");
  console.log(`[prisma-link] linked ${linkPath} -> ${target}`);
}

ensurePrismaLink();

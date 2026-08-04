#!/usr/bin/env node
// Single command to get a working local DATABASE_URL. If one's already
// configured (shell env or services/api/.env), do nothing — Path A (an
// existing instance, see infra/postgres-init.sql's header) is just as
// valid as the disposable Path B this sets up. Otherwise: start
// Postgres via docker compose (postgres-init.sql creates the role + db
// automatically on first start), offer to grant CREATEDB so `prisma
// migrate dev` can use its shadow database (deliberately left out of
// that SQL script since it also runs against production-track
// instances, which must stay least-privilege — see the comment there),
// write DATABASE_URL, then offer to run migrations, since a freshly
// created database has no schema yet.
//
// Every step that runs while a readline prompt is still pending uses
// async `spawn`, not `spawnSync` — spawnSync blocks Node's entire event
// loop, which races with readline's own buffering of piped stdin and
// can drop an already-typed answer to the *next* question.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "services", "api", ".env");

function hasDatabaseUrl() {
  if (process.env.DATABASE_URL) return true;
  return existsSync(envPath) && /^DATABASE_URL=.+/m.test(readFileSync(envPath, "utf8"));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"], ...opts });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function waitForPostgres(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = spawnSync("docker", [
      "compose", "exec", "-T", "postgres", "pg_isready", "-U", "postgres",
    ]);
    if (result.status === 0) return true;
    await sleep(500);
  }
  return false;
}

if (hasDatabaseUrl()) {
  console.log("DATABASE_URL already configured — leaving it as-is.");
  process.exit(0);
}

console.log("No DATABASE_URL configured — starting local Postgres via docker compose...");
const upCode = await run("docker", ["compose", "up", "-d", "postgres"]);
if (upCode !== 0) process.exit(upCode);

console.log("Waiting for Postgres to accept connections...");
if (!(await waitForPostgres())) {
  console.error("Postgres did not become ready in time.");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function confirm(question) {
  const answer = await rl.question(`${question} [Y/n] `);
  return !/^n/i.test(answer.trim());
}

if (await confirm("Grant CREATEDB to ecommerce_app (needed for `prisma migrate dev`'s shadow database)?")) {
  await run("docker", [
    "compose", "exec", "-T", "postgres", "psql", "-U", "postgres",
    "-c", "ALTER ROLE ecommerce_app CREATEDB;",
  ]);
}

const appPassword = process.env.APP_DB_PASSWORD || "ecommerce_dev";
const databaseUrl = `postgresql://ecommerce_app:${appPassword}@localhost:5432/ecommerce`;
appendFileSync(envPath, `DATABASE_URL=${databaseUrl}\n`);
console.log(`Wrote DATABASE_URL to ${envPath}`);

const runMigrate = await confirm("Run `prisma migrate dev` now to set up the schema?");
rl.close();

if (runMigrate) {
  const migrateCode = await run("pnpm", ["--filter", "@reality-shop/api", "db:migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  process.exit(migrateCode);
}

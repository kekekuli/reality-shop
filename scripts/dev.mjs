#!/usr/bin/env node
// Owns the dev-session lifecycle directly instead of relying on pnpm's
// pre/post script hooks — those only fire after a *successful* (exit 0)
// run of the base script, but `turbo dev` is persistent and only ever
// stops via Ctrl+C or a crash, so a postdev hook never actually ran.
// Node's signal handling is explicit (no default termination once a
// listener is registered), so cleanup is guaranteed to run from the
// child's single 'exit' event regardless of how it terminated.
import { spawn, spawnSync } from "node:child_process";

spawnSync("docker", ["compose", "up", "-d", "traefik"], { stdio: "inherit" });

const child = spawn("turbo", ["dev"], { stdio: "inherit" });

function cleanup() {
  spawnSync("docker", ["compose", "rm", "-sf", "traefik"], { stdio: "inherit" });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  cleanup();
  process.exit(code ?? (signal ? 1 : 0));
});

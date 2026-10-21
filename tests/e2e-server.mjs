import { spawn } from "node:child_process";
import { mockEnv } from "./mock-env.mjs";
import { startMock } from "./mock-server.mjs";
import { seedCatalog } from "./seed.ts";

await startMock(4010);
const env = { ...process.env, ...mockEnv(), NEXT_PUBLIC_SITE_URL: "http://localhost:3100" };
// Pages are prerendered at build time, so the catalog must be in place first.
await seedCatalog(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const next = (...args) =>
  new Promise((resolve, reject) => {
    spawn("npx", ["next", ...args], { stdio: "inherit", shell: true, env }).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} failed`))));
  });

await next("build");
await next("start", "-p", "3100");

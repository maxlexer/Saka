import { spawn } from "node:child_process";
import { startMock } from "./mock-server.mjs";

await startMock(4010);

const env = {
  ...process.env,
  SANITY_PROJECT_ID: "mock",
  SANITY_API_HOST: "http://127.0.0.1:4010",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
};
const next = (...args) =>
  new Promise((resolve, reject) => {
    spawn("npx", ["next", ...args], { stdio: "inherit", shell: true, env }).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} failed`))));
  });

await next("build");
await next("start", "-p", "3100");

import { spawn } from "node:child_process";
import { startMock } from "./mock-server.mjs";

await startMock(4010);

// Supabase values come from .env.test, loaded by playwright.config.ts and inherited here.
const env = {
  ...process.env,
  SANITY_PROJECT_ID: "mock",
  SANITY_API_HOST: "http://127.0.0.1:4010",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  KHQR_API_BASE: "http://127.0.0.1:4010",
  KHQR_TOKEN: "test-khqr-token",
  TELEGRAM_API_BASE: "http://127.0.0.1:4010",
  TELEGRAM_BOT_TOKEN: "123:test",
  TELEGRAM_BOT_USERNAME: "saka_test_bot",
  TELEGRAM_ADMIN_CHAT_ID: "-1001",
  TELEGRAM_WEBHOOK_SECRET: "test-tg-secret",
  CRON_SECRET: "test-cron-secret",
};
const next = (...args) =>
  new Promise((resolve, reject) => {
    spawn("npx", ["next", ...args], { stdio: "inherit", shell: true, env }).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} failed`))));
  });

await next("build");
await next("start", "-p", "3100");

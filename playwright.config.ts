import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.test");
} catch {
  // Optional. Without it the checkout specs skip.
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3100" },
  webServer: { command: "node tests/e2e-server.mjs", url: "http://localhost:3100", timeout: 240_000, reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});

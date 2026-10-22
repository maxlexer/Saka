import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir: "tests/e2e", workers: 1, expect: { timeout: 15_000 }, use: { baseURL: "http://localhost:3100" }, projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }, { name: "mobile", use: { ...devices["Pixel 7"] } }] });

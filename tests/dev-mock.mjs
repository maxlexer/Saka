import { spawn } from "node:child_process";
import { MOCK, mockEnv } from "./mock-env.mjs";
import { startMock } from "./mock-server.mjs";
import { seedCatalog } from "./seed.ts";

// Local preview without a Supabase project. Payments can be created but never settle (no settle_order in the mock).
await startMock(4010);
await seedCatalog(MOCK, "mock");
spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...mockEnv(), SUPABASE_URL: MOCK, SUPABASE_SERVICE_ROLE_KEY: "mock", ADMIN_PASSWORD: "saka-local" },
});

export const MOCK = "http://127.0.0.1:4010";

/** Everything the app needs to run against the local mock. Real Supabase values from .env.test win when present. */
export const mockEnv = () => ({
  SUPABASE_URL: process.env.SUPABASE_URL || MOCK,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "mock",
  KHQR_API_BASE: MOCK,
  KHQR_TOKEN: "test-khqr-token",
  TELEGRAM_API_BASE: MOCK,
  TELEGRAM_BOT_TOKEN: "123:test",
  TELEGRAM_BOT_USERNAME: "saka_test_bot",
  TELEGRAM_ADMIN_CHAT_ID: "-1001",
  TELEGRAM_WEBHOOK_SECRET: "test-tg-secret",
  CRON_SECRET: "test-cron-secret",
  ADMIN_PASSWORD: "test-admin-password",
  ADMIN_SESSION_SECRET: "test-session-secret-0123456789abcdef",
});

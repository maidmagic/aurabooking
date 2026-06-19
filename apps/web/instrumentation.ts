import * as Sentry from "@sentry/nextjs";

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "",
    tracesSampleRate: process.env.SENTRY_DSN ? 0.1 : 0,
    environment: process.env.VERCEL_ENV || "development",
    enabled: !!process.env.SENTRY_DSN,
  });
}

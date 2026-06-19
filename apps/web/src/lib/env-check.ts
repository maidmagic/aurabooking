const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "OPENROUTER_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "SHORT_DOMAIN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "PRIVACY_POLICY_URL",
  "TERMS_URL",
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  if (typeof window !== "undefined") return; // client-side

  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    console.error(`[AuraBooking] Missing required env vars: ${missing.join(", ")}`);
    console.error("[AuraBooking] The app may not function correctly until these are set.");
  }

  validated = true;
}

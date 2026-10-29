import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const sourceDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(sourceDir, "../../.env") });
dotenv.config({ path: resolve(sourceDir, "../.env"), override: true });

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalStringFromEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function booleanFromEnv(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function emailListFromEnv(value: string | undefined, fallback: string[] = []) {
  const source = value === undefined ? fallback : value.split(",");
  return [...new Set(source.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

function stringListFromEnv(value: string | undefined) {
  return [...new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

export const config = {
  port: numberFromEnv(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL,
  authSecret: process.env.BETTER_AUTH_SECRET,
  authUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  authAllowedHosts: stringListFromEnv(process.env.BETTER_AUTH_ALLOWED_HOSTS),
  appScheme: process.env.APP_SCHEME ?? "materialapp",
  googleClientId: optionalStringFromEnv(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: optionalStringFromEnv(process.env.GOOGLE_CLIENT_SECRET),
  googleHostedDomain: optionalStringFromEnv(process.env.GOOGLE_HOSTED_DOMAIN),
  googleAuthAllowSignUp: booleanFromEnv(process.env.GOOGLE_AUTH_ALLOW_SIGN_UP),
  bootstrapAdminEmails: emailListFromEnv(process.env.BOOTSTRAP_ADMIN_EMAILS, ["nttantts@gmail.com"]),
  resendApiKey: optionalStringFromEnv(process.env.RESEND_API_KEY),
  resendFromEmail: optionalStringFromEnv(process.env.RESEND_FROM_EMAIL) ?? "Material App <onboarding@resend.dev>",
  appUrl: optionalStringFromEnv(process.env.APP_URL) ?? process.env.BETTER_AUTH_URL ?? "https://material-api-4fsd6i-64cac0-103-72-98-129.sslip.io",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:8081")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .concat(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
};

export function requireServerConfig() {
  const missing = [
    !config.databaseUrl && "DATABASE_URL",
    !config.authSecret && "BETTER_AUTH_SECRET",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(", ")}`);
  }
}

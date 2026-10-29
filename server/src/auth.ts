import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "./config.js";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const googleSocialProvider =
  config.googleClientId && config.googleClientSecret
    ? {
        google: {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
          disableSignUp: !config.googleAuthAllowSignUp,
          ...(config.googleHostedDomain ? { hd: config.googleHostedDomain } : {}),
        },
      }
    : undefined;

const dynamicAuthBaseURL = config.authAllowedHosts.length > 0
  ? { allowedHosts: config.authAllowedHosts, protocol: "auto" as const }
  : config.authUrl;

export const auth = betterAuth({
  baseURL: dynamicAuthBaseURL,
  secret: config.authSecret,
  trustedOrigins: [
    ...config.corsOrigins,
    `${config.appScheme}://`,
    `${config.appScheme}://*`,
    // Expo Go uses an exp:// origin in both LAN and tunnel development.
    "exp://",
    "exp://**",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 6 },
  ...(googleSocialProvider ? { socialProviders: googleSocialProvider } : {}),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "site", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => ({
          data: {
            ...newUser,
            ...(config.bootstrapAdminEmails.includes(newUser.email.trim().toLowerCase())
              ? { role: "admin" }
              : {}),
          },
        }),
      },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(config.authAllowedHosts.length > 0 ? { advanced: { trustedProxyHeaders: true } } : {}),
  plugins: [expo()],
});

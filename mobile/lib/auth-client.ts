import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { apiBaseUrl } from "./runtime-config";
const baseAuthClient = createAuthClient({ baseURL: apiBaseUrl, plugins: [expoClient({ scheme: "materialapp", storagePrefix: "materialapp", storage: SecureStore })] });
const useBaseSession = baseAuthClient.useSession;
export type AppUser = { id: string; name: string; email: string; role: "admin" | "site" | "accountant" };

let authNavigationPendingUntil = 0;

export function markAuthNavigationPending(durationMs = 4500) {
  authNavigationPendingUntil = Date.now() + durationMs;
}

export function isAuthNavigationPending() {
  return Date.now() < authNavigationPendingUntil;
}

export function clearAuthNavigationPending() {
  authNavigationPendingUntil = 0;
}

/** Keeps existing sessions compatible while the server migrates director users to admin. */
function useCurrentSession() {
  const session = useBaseSession();
  const data = session.data;
  if (!data || (data.user as { role?: string } | undefined)?.role !== "director") return session;
  return {
    ...session,
    data: {
      ...data,
      user: { ...data.user, role: "admin" },
    },
  };
}

export const authClient = Object.assign(baseAuthClient, { useSession: useCurrentSession });

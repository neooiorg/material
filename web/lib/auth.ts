import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: typeof window === "undefined" ? "http://localhost:3000" : window.location.origin });
export type Role = "admin" | "site" | "accountant";
export type AccountRole = Role | "pending";
export type AppUser = { id: string; name: string; email: string; role: AccountRole };

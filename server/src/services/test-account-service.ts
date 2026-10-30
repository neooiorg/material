import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { account, user, type UserRole } from "../db/schema.js";

export const TEST_PASSWORD = "Test@123456";
export const TEST_ACCOUNTS: { email: string; name: string; role: Extract<UserRole, "admin" | "site" | "accountant"> }[] = [
  { email: "admin@test.neooi.com", name: "Admin thử nghiệm", role: "admin" },
  { email: "site@test.neooi.com", name: "Kỹ thuật thử nghiệm", role: "site" },
  { email: "accountant@test.neooi.com", name: "Kế toán thử nghiệm", role: "accountant" },
];

export async function ensureTestAccounts() {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const item of TEST_ACCOUNTS) {
    let [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, item.email));
    const now = new Date();
    if (!existing) {
      const id = randomUUID();
      await db.insert(user).values({ id, name: item.name, email: item.email, emailVerified: true, role: item.role, createdAt: now, updatedAt: now });
      existing = { id };
    } else {
      await db.update(user).set({ name: item.name, role: item.role, emailVerified: true, updatedAt: now }).where(eq(user.id, existing.id));
    }
    const [credential] = await db.select({ id: account.id }).from(account).where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")));
    if (credential) await db.update(account).set({ password: passwordHash, updatedAt: now }).where(eq(account.id, credential.id));
    else await db.insert(account).values({ id: randomUUID(), accountId: existing.id, providerId: "credential", userId: existing.id, password: passwordHash, createdAt: now, updatedAt: now });
  }
}

export function publicTestAccounts() {
  return { password: TEST_PASSWORD, accounts: TEST_ACCOUNTS.map(({ email, name, role }) => ({ email, name, role })) };
}

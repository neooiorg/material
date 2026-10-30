import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

/** Lightweight idempotent runtime migrations for enum changes not covered by app bootstrapping. */
export async function ensureRuntimeDatabaseCompatibility() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regtype('public.role') IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'accountant'
          AND enumtypid = 'public.role'::regtype
      ) THEN
        ALTER TYPE "role" ADD VALUE 'accountant';
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regtype('public.role') IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'pending'
          AND enumtypid = 'public.role'::regtype
      ) THEN
        ALTER TYPE "role" ADD VALUE 'pending';
      END IF;
    END $$;
  `);
  await db.execute(sql`ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'pending'`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      requested_role TEXT NOT NULL DEFAULT 'site',
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS access_requests_user_id_uq ON access_requests(user_id)`);
  await db.execute(sql`
    DO $$
    DECLARE
      actual_posted_column_existed BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'actual_posted_at'
      ) INTO actual_posted_column_existed;

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_note TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_posted_at TIMESTAMP;

      IF NOT actual_posted_column_existed THEN
        UPDATE orders
        SET actual_posted_at = COALESCE(approved_at, delivered_at, created_at)
        WHERE status IN ('approved', 'delivered') AND actual_posted_at IS NULL;
      END IF;
    END $$;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_proofs (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS order_proofs_order_id_idx ON order_proofs(order_id)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_vapid_keys (
      id TEXT PRIMARY KEY,
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

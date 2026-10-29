DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'accountant'
      AND enumtypid = 'role'::regtype
  ) THEN
    ALTER TYPE "role" ADD VALUE 'accountant';
  END IF;
END $$;

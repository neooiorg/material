import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { account, session, user, verification } from "../lib/db/schema";

const ADMIN_EMAIL = "nttantts@gmail.com";
const ADMIN_NAME = "Nguyễn Thanh Tân";
const DEMO_EMAILS = [
  "admin@demo.vn",
  "director@demo.vn",
  "site@demo.vn",
  "supplier@demo.vn",
  "accountant@demo.vn",
] as const;

/**
 * Seed tài khoản quản trị an toàn.
 *
 * Script này KHÔNG xoá dữ liệu domain, KHÔNG tạo tài khoản demo và KHÔNG tạo
 * tài khoản nhà cung cấp/cửa hàng. Nó:
 * - gỡ quyền đăng nhập của các email demo cũ nếu còn tồn tại;
 * - đảm bảo email nội bộ được chỉ định có quyền `admin`.
 */
async function removeDemoAccounts() {
  for (const email of DEMO_EMAILS) {
    const [demoUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (!demoUser) continue;

    await db.delete(session).where(eq(session.userId, demoUser.id));
    await db.delete(account).where(eq(account.userId, demoUser.id));
    await db.delete(verification).where(eq(verification.identifier, email));

    try {
      await db.delete(user).where(eq(user.id, demoUser.id));
      console.log(`✅ Đã xoá tài khoản demo ${email}.`);
    } catch {
      const archivedEmail = `removed+${email.replace(/[^a-z0-9]/gi, "-").toLowerCase()}@demo.invalid`;
      await db
        .update(user)
        .set({
          name: "Tài khoản demo đã xoá",
          email: archivedEmail,
          role: "site",
          updatedAt: new Date(),
        })
        .where(eq(user.id, demoUser.id));
      console.log(`✅ Đã vô hiệu hoá tài khoản demo ${email} vì đang được dữ liệu lịch sử tham chiếu.`);
    }
  }
}

async function ensureAdmin() {
  const [existing] = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL));

  if (existing) {
    await db
      .update(user)
      .set({ name: existing.name || ADMIN_NAME, role: "admin", updatedAt: new Date() })
      .where(eq(user.email, ADMIN_EMAIL));
    console.log(`✅ Đã cập nhật quyền admin cho ${ADMIN_EMAIL}.`);
    return;
  }

  await db.insert(user).values({
    id: randomUUID(),
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    emailVerified: true,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Đã tạo tài khoản admin ${ADMIN_EMAIL}.`);
  console.log("Tài khoản mới chưa có mật khẩu local; hãy đăng nhập Google hoặc dùng màn hình Thành viên để đặt/mời lại nếu cần.");
}

removeDemoAccounts()
  .then(ensureAdmin)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed lỗi:", error);
    process.exit(1);
  });

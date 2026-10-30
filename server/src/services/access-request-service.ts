import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accessRequests, notifications, user, type UserRole } from "../db/schema.js";
import { logActivity } from "./activity-service.js";
import { sendPushNotifications } from "./push-service.js";

type Actor = { id: string; name: string; email: string; role: UserRole };
type GrantableRole = Extract<UserRole, "admin" | "site" | "accountant">;
type RequestedRole = Extract<UserRole, "site" | "accountant">;

const grantableRoles: GrantableRole[] = ["admin", "site", "accountant"];
const requestedRoles: RequestedRole[] = ["site", "accountant"];
const roleNames: Record<GrantableRole, string> = {
  admin: "Quản trị viên",
  site: "Bộ phận thi công",
  accountant: "Kế toán",
};

function requestedRole(value: unknown): RequestedRole {
  if (!requestedRoles.includes(value as RequestedRole)) throw new Error("Vai trò đề xuất không hợp lệ.");
  return value as RequestedRole;
}

function grantedRole(value: unknown): GrantableRole {
  if (!grantableRoles.includes(value as GrantableRole)) throw new Error("Vai trò cấp quyền không hợp lệ.");
  return value as GrantableRole;
}

function cleanNote(value: unknown) {
  const note = typeof value === "string" ? value.trim() : "";
  if (note.length > 500) throw new Error("Ghi chú không được vượt quá 500 ký tự.");
  return note || null;
}

export async function getOwnAccessRequest(actor: Actor) {
  const [request] = await db.select({
    id: accessRequests.id,
    requestedRole: accessRequests.requestedRole,
    note: accessRequests.note,
    status: accessRequests.status,
    createdAt: accessRequests.createdAt,
    updatedAt: accessRequests.updatedAt,
  }).from(accessRequests).where(eq(accessRequests.userId, actor.id)).limit(1);
  return request ?? null;
}

export async function submitAccessRequest(actor: Actor, input: { requestedRole?: unknown; note?: unknown }) {
  if (actor.role !== "pending") throw new Error("Tài khoản đã được phân quyền, không cần gửi yêu cầu.");
  const role = requestedRole(input.requestedRole);
  const note = cleanNote(input.note);
  const now = new Date();
  let adminIds: string[] = [];
  await db.transaction(async (tx) => {
    await tx.insert(accessRequests).values({
      id: randomUUID(),
      userId: actor.id,
      requestedRole: role,
      note,
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: accessRequests.userId,
      set: { requestedRole: role, note, status: "pending", reviewedById: null, reviewedAt: null, updatedAt: now },
    });
    const admins = await tx.select({ id: user.id }).from(user).where(eq(user.role, "admin"));
    adminIds = admins.map((admin) => admin.id);
    if (admins.length) await tx.insert(notifications).values(admins.map((admin) => ({
      userId: admin.id,
      title: "Yêu cầu phân quyền mới",
      message: `${actor.name} (${actor.email}) đề xuất vai trò ${roleNames[role]}.`,
    })));
  });
  await sendPushNotifications(adminIds, { title: "Yêu cầu phân quyền mới", body: `${actor.name} (${actor.email}) đề xuất vai trò ${roleNames[role]}.`, url: "/admin/members", tag: `access-request-${actor.id}` });
  return getOwnAccessRequest(actor);
}

export async function listPendingAccessRequests() {
  return db.select({
    id: accessRequests.id,
    userId: accessRequests.userId,
    name: user.name,
    email: user.email,
    image: user.image,
    requestedRole: accessRequests.requestedRole,
    note: accessRequests.note,
    createdAt: accessRequests.createdAt,
  }).from(accessRequests)
    .innerJoin(user, eq(user.id, accessRequests.userId))
    .where(and(eq(accessRequests.status, "pending"), eq(user.role, "pending")))
    .orderBy(asc(accessRequests.createdAt));
}

export async function approveAccessRequest(actor: Actor, id: string, input: { role?: unknown }) {
  const role = grantedRole(input.role);
  let requesterId = "";
  await db.transaction(async (tx) => {
    const [request] = await tx.update(accessRequests).set({
      status: "approved",
      reviewedById: actor.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(accessRequests.id, id), eq(accessRequests.status, "pending"))).returning({ userId: accessRequests.userId });
    if (!request) throw new Error("Yêu cầu không còn ở trạng thái chờ duyệt.");
    requesterId = request.userId;
    const [requester] = await tx.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, request.userId)).returning({ name: user.name });
    if (!requester) throw new Error("Không tìm thấy tài khoản yêu cầu.");
    await tx.insert(notifications).values({
      userId: request.userId,
      title: "Yêu cầu quyền đã được duyệt",
      message: `Bạn đã được cấp vai trò ${roleNames[role]}.`,
    });
    await logActivity(tx, {
      actorId: actor.id,
      actorName: actor.name,
      action: "access_request.approved",
      entityType: "member",
      summary: `${actor.name} cấp vai trò ${roleNames[role]} cho ${requester.name}.`,
    });
  });
  await sendPushNotifications([requesterId], { title: "Yêu cầu quyền đã được duyệt", body: `Bạn đã được cấp vai trò ${roleNames[role]}.`, url: "/", tag: `access-approved-${id}` });
}

export async function rejectAccessRequest(actor: Actor, id: string) {
  let requesterId = "";
  await db.transaction(async (tx) => {
    const [request] = await tx.update(accessRequests).set({
      status: "rejected",
      reviewedById: actor.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(accessRequests.id, id), eq(accessRequests.status, "pending"))).returning({ userId: accessRequests.userId });
    if (!request) throw new Error("Yêu cầu không còn ở trạng thái chờ duyệt.");
    requesterId = request.userId;
    await tx.insert(notifications).values({
      userId: request.userId,
      title: "Yêu cầu quyền chưa được chấp thuận",
      message: "Bạn có thể kiểm tra lại thông tin và gửi yêu cầu mới.",
    });
    await logActivity(tx, {
      actorId: actor.id,
      actorName: actor.name,
      action: "access_request.rejected",
      entityType: "member",
      summary: `${actor.name} từ chối một yêu cầu phân quyền.`,
    });
  });
  await sendPushNotifications([requesterId], { title: "Yêu cầu quyền chưa được chấp thuận", body: "Bạn có thể kiểm tra lại thông tin và gửi yêu cầu mới.", url: "/", tag: `access-rejected-${id}` });
}

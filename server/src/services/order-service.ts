import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  activityLog, materials, notifications, orderItems, orders,
  projectSupplierContacts, projects, supplierContacts, user, type UserRole,
} from "../db/schema.js";
import { toNumber } from "../lib/utils.js";
import { logActivity } from "./activity-service.js";
import { sendEmail } from "./email-service.js";
import { listProofs, listReceiptEvents } from "./receipt-service.js";
import { sendPushNotifications } from "./push-service.js";

type CurrentUser = { id: string; name: string; role: UserRole };
type NewOrder = { projectId: number; supplierContactId?: number | null; note?: string | null; items?: { materialId: number; qty: number; unitPrice: number }[] };

const creator = alias(user, "creator");
const receiver = alias(user, "receiver");

function scopedOrderWhere(me: CurrentUser) {
  if (me.role === "site") return eq(orders.createdById, me.id);
  return undefined;
}

export async function listOrders(me: CurrentUser) {
  return db.select({
    id: orders.id, code: orders.code, projectName: projects.name,
    creatorName: creator.name,
    createdAt: orders.createdAt, status: orders.status, total: orders.total,
  }).from(orders)
    .innerJoin(projects, eq(orders.projectId, projects.id))
    .innerJoin(creator, eq(orders.createdById, creator.id))
    .where(scopedOrderWhere(me)).orderBy(desc(orders.createdAt));
}

export async function getOrder(me: CurrentUser, orderId: number) {
  const [order] = await db.select({
    id: orders.id, code: orders.code, status: orders.status, note: orders.note,
    total: orders.total, createdAt: orders.createdAt, approvedAt: orders.approvedAt,
    deliveredAt: orders.deliveredAt, rejectedReason: orders.rejectedReason,
    receiptNote: orders.receiptNote, actualPostedAt: orders.actualPostedAt,
    createdById: orders.createdById,
    projectName: projects.name, creatorName: creator.name, receivedByName: receiver.name,
    supplierContactName: supplierContacts.name, supplierContactPhone: supplierContacts.phone,
  }).from(orders).innerJoin(projects, eq(orders.projectId, projects.id))
    .innerJoin(creator, eq(orders.createdById, creator.id))
    .leftJoin(receiver, eq(orders.receivedById, receiver.id))
    .leftJoin(supplierContacts, eq(orders.supplierContactId, supplierContacts.id))
    .where(eq(orders.id, orderId));
  if (!order) return null;
  if (me.role === "site" && order.createdById !== me.id) throw new Error("Bạn không có quyền xem đơn này.");
  const [items, timeline, proofs, receiptEvents] = await Promise.all([
    db.select({ id: orderItems.id, materialId: materials.id, name: materials.name, unit: materials.unit,
      group: materials.group, qty: orderItems.qty, unitPrice: orderItems.unitPrice, amount: orderItems.amount })
      .from(orderItems).innerJoin(materials, eq(orderItems.materialId, materials.id))
      .where(eq(orderItems.orderId, orderId)),
    db.select().from(activityLog).where(and(eq(activityLog.entityType, "order"), eq(activityLog.entityId, orderId)))
      .orderBy(asc(activityLog.createdAt)),
    listProofs(me, orderId),
    listReceiptEvents(me, orderId),
  ]);
  return { ...order, supplierContact: order.supplierContactName ? { name: order.supplierContactName, phone: order.supplierContactPhone } : null, items, timeline, proofs, receiptEvents };
}

export async function getApprovalOrders() {
  return listActionOrders(eq(orders.status, "pending"), orders.createdAt);
}

async function listActionOrders(where: ReturnType<typeof eq> | undefined, orderColumn: typeof orders.createdAt | typeof orders.approvedAt) {
  const rows = await db.select({
    id: orders.id, code: orders.code, total: orders.total, note: orders.note,
    createdAt: orders.createdAt, approvedAt: orders.approvedAt,
    projectName: projects.name, creatorName: creator.name,
  }).from(orders).innerJoin(projects, eq(orders.projectId, projects.id))
    .innerJoin(creator, eq(orders.createdById, creator.id)).where(where).orderBy(desc(orderColumn));
  return Promise.all(rows.map(async (row) => ({
    ...row,
    items: await db.select({ id: orderItems.id, name: materials.name, unit: materials.unit, qty: orderItems.qty, amount: orderItems.amount })
      .from(orderItems).innerJoin(materials, eq(orderItems.materialId, materials.id)).where(eq(orderItems.orderId, row.id)),
  })));
}

export async function createOrder(me: CurrentUser, input: NewOrder) {
  if (me.role !== "site" && me.role !== "admin") throw new Error("Chỉ Bộ phận thi công mới được tạo đơn.");
  const items = (input.items ?? []).filter((item) => item.materialId && toNumber(item.qty) > 0);
  if (!input.projectId) throw new Error("Vui lòng chọn công trình.");
  if (!items.length) throw new Error("Đơn phải có ít nhất một dòng vật tư hợp lệ.");
  const total = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.unitPrice), 0);
  const [projectConfig] = await db.select({ defaultSupplierContactId: projects.defaultSupplierContactId }).from(projects).where(eq(projects.id, input.projectId));
  const supplierContactId = input.supplierContactId ?? projectConfig?.defaultSupplierContactId ?? null;
  if (supplierContactId) {
    const [linkedContact] = await db.select({ id: projectSupplierContacts.supplierContactId })
      .from(projectSupplierContacts)
      .where(and(eq(projectSupplierContacts.projectId, input.projectId), eq(projectSupplierContacts.supplierContactId, supplierContactId)));
    if (!linkedContact) throw new Error("Đơn vị cung cấp không thuộc công trình đã chọn.");
  }
  let newOrderId = 0;
  let orderCode = "";
  let projectName = "";
  let adminEmails: string[] = [];
  let adminIds: string[] = [];
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(orders).values({ code: "TMP", projectId: input.projectId,
      supplierId: null, supplierContactId, createdById: me.id, status: "pending", note: input.note || null,
      total: total.toFixed(2) }).returning({ id: orders.id });
    newOrderId = inserted.id;
    const code = `DH${String(inserted.id).padStart(5, "0")}`;
    orderCode = code;
    await tx.update(orders).set({ code }).where(eq(orders.id, inserted.id));
    await tx.insert(orderItems).values(items.map((item) => ({ orderId: inserted.id, materialId: item.materialId,
      qty: toNumber(item.qty).toFixed(3), unitPrice: toNumber(item.unitPrice).toFixed(2),
      amount: (toNumber(item.qty) * toNumber(item.unitPrice)).toFixed(2) })));
    const admins = await tx.select({ id: user.id, email: user.email }).from(user).where(eq(user.role, "admin"));
    const [project] = await tx.select({ name: projects.name }).from(projects).where(eq(projects.id, input.projectId));
    projectName = project?.name ?? "";
    adminEmails = admins.map((row) => row.email);
    const recipients = admins.map((row) => row.id);
    adminIds = recipients;
    if (recipients.length) await tx.insert(notifications).values(recipients.map((userId) => ({ userId,
      title: `Đơn đặt vật tư mới ${code}`, message: `${me.name} vừa tạo đơn ${code} cho công trình "${project?.name ?? ""}".`, orderId: inserted.id })));
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.created", entityType: "order", entityId: inserted.id,
      summary: `${me.name} đã tạo đơn ${code} cho công trình "${project?.name ?? ""}" (${total.toLocaleString("vi-VN")} ₫).` });
  });
  await sendPushNotifications(adminIds, {
    title: `Đơn đặt vật tư mới ${orderCode}`,
    body: `${me.name} vừa tạo đơn cho công trình "${projectName}".`,
    url: `/orders/${newOrderId}`,
    tag: `order-created-${newOrderId}`,
  });
  await Promise.allSettled(adminEmails.map((email) => sendEmail({
    to: email,
    subject: `Đơn đặt vật tư mới ${orderCode}`,
    text: `${me.name} vừa tạo đơn ${orderCode} cho công trình "${projectName}". Vui lòng mở app để xem và duyệt.`,
    html: `<p><strong>${me.name}</strong> vừa tạo đơn <strong>${orderCode}</strong> cho công trình <strong>${projectName}</strong>.</p><p>Vui lòng mở app để xem và duyệt.</p>`,
  })));
  return { orderId: newOrderId };
}

export async function approveOrder(me: CurrentUser, orderId: number) {
  if (me.role !== "admin") throw new Error("Chỉ quản trị mới được duyệt đơn.");
  let creatorEmail = "";
  let creatorId = "";
  let code = "";
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("Không tìm thấy đơn.");
    if (order.status !== "pending") throw new Error("Đơn không ở trạng thái chờ duyệt.");
    const [creatorUser] = await tx.select({ email: user.email }).from(user).where(eq(user.id, order.createdById));
    creatorEmail = creatorUser?.email ?? "";
    creatorId = order.createdById;
    code = order.code;
    await tx.update(orders).set({ status: "approved", approvedAt: new Date(), approvedById: me.id }).where(eq(orders.id, orderId));
    const recipients = [order.createdById];
    await tx.insert(notifications).values(recipients.map((userId) => ({ userId, title: `Đơn ${order.code} đã được duyệt`,
      message: `Đơn ${order.code} của bạn đã được duyệt.`, orderId })));
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.approved", entityType: "order", entityId: orderId,
      summary: `${me.name} đã duyệt đơn ${order.code}. Đơn đang chờ kỹ thuật xác nhận nhận hàng.` });
  });
  await sendPushNotifications([creatorId], { title: `Đơn ${code} đã được duyệt`, body: `Đơn ${code} của bạn đã được duyệt và đang chờ nhận hàng.`, url: `/orders/${orderId}`, tag: `order-approved-${orderId}` });
  if (creatorEmail) await sendEmail({
    to: creatorEmail,
    subject: `Đơn ${code} đã được duyệt`,
    text: `Đơn ${code} của bạn đã được duyệt. Vui lòng mở app để theo dõi.`,
    html: `<p>Đơn <strong>${code}</strong> của bạn đã được duyệt.</p><p>Vui lòng mở app để theo dõi.</p>`,
  }).catch(() => undefined);
}

export async function rejectOrder(me: CurrentUser, orderId: number, reason: string) {
  if (me.role !== "admin") throw new Error("Chỉ quản trị mới được từ chối đơn.");
  let creatorEmail = "";
  let creatorId = "";
  let code = "";
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("Không tìm thấy đơn.");
    if (order.status !== "pending") throw new Error("Đơn không ở trạng thái chờ duyệt.");
    const [creatorUser] = await tx.select({ email: user.email }).from(user).where(eq(user.id, order.createdById));
    creatorEmail = creatorUser?.email ?? "";
    creatorId = order.createdById;
    code = order.code;
    await tx.update(orders).set({ status: "rejected", rejectedReason: reason || null, approvedById: me.id, approvedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(notifications).values({ userId: order.createdById, title: `Đơn ${order.code} bị từ chối`,
      message: `Đơn ${order.code} đã bị từ chối${reason ? `: ${reason}` : "."}`, orderId });
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.rejected", entityType: "order", entityId: orderId,
      summary: `${me.name} đã từ chối đơn ${order.code}${reason ? `: ${reason}` : "."}` });
  });
  await sendPushNotifications([creatorId], { title: `Đơn ${code} bị từ chối`, body: `Đơn ${code} đã bị từ chối${reason ? `: ${reason}` : "."}`, url: `/orders/${orderId}`, tag: `order-rejected-${orderId}` });
  if (creatorEmail) await sendEmail({
    to: creatorEmail,
    subject: `Đơn ${code} bị từ chối`,
    text: `Đơn ${code} đã bị từ chối${reason ? `: ${reason}` : "."}`,
    html: `<p>Đơn <strong>${code}</strong> đã bị từ chối${reason ? `: ${reason}` : "."}</p>`,
  }).catch(() => undefined);
}

export async function markNotificationsRead(me: CurrentUser, ids?: number[]) {
  const conditions = [eq(notifications.userId, me.id), eq(notifications.isRead, false)];
  if (ids?.length) conditions.push(inArray(notifications.id, ids));
  await db.update(notifications).set({ isRead: true }).where(and(...conditions));
}

import { basename, resolve } from "node:path";
import { unlink } from "node:fs/promises";
import { fileTypeFromFile } from "file-type";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  materials, notifications, orderItems, orderProofs, orderReceiptItems, orderReceipts,
  orders, projectMaterialActual, projects, user,
  type UserRole,
} from "../db/schema.js";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { logActivity } from "./activity-service.js";
import { sendPushNotifications } from "./push-service.js";
import { canAccessProject, siteOrderScope } from "./project-access-service.js";

type CurrentUser = { id: string; name: string; role: UserRole };
const creator = alias(user, "receipt_creator");
const uploader = alias(user, "proof_uploader");
const receiver = alias(user, "receipt_receiver");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function canManageOrder(me: CurrentUser, order: { createdById: string; projectId: number }) {
  return me.role === "admin" || (me.role === "site" && (me.id === order.createdById || await canAccessProject(me.id, order.projectId)));
}

async function getOrderForAction(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new HttpError(404, "Không tìm thấy đơn.");
  return order;
}

async function safelyUnlink(path: string) {
  await unlink(path).catch(() => undefined);
}

function proofPath(storedName: string) {
  const safeName = basename(storedName);
  const absolute = resolve(config.uploadDir, safeName);
  const root = resolve(config.uploadDir);
  if (!absolute.startsWith(root + "\\") && !absolute.startsWith(root + "/")) throw new HttpError(400, "Đường dẫn chứng từ không hợp lệ.");
  return absolute;
}

export async function listReceipts(me: CurrentUser) {
  const where = me.role === "site"
    ? and(eq(orders.status, "approved"), siteOrderScope(me.id))
    : eq(orders.status, "approved");
  return db.select({
    id: orders.id, code: orders.code, projectName: projects.name, creatorName: creator.name,
    approvedAt: orders.approvedAt, total: orders.total, proofCount: count(orderProofs.id),
    receiptCount: sql<number>`(select count(*) from order_receipts receipt_count where receipt_count.order_id = ${orders.id})`,
    receivedAmount: sql<string>`(select coalesce(sum(receipt_item.amount), 0) from order_receipt_items receipt_item inner join order_receipts receipt on receipt.id = receipt_item.receipt_id where receipt.order_id = ${orders.id})`,
  }).from(orders)
    .innerJoin(projects, eq(orders.projectId, projects.id))
    .innerJoin(creator, eq(orders.createdById, creator.id))
    .leftJoin(orderProofs, eq(orderProofs.orderId, orders.id))
    .where(where)
    .groupBy(orders.id, projects.name, creator.name)
    .orderBy(desc(orders.approvedAt));
}

export async function listProofs(me: CurrentUser, orderId: number) {
  const order = await getOrderForAction(orderId);
  if (me.role === "site" && !(await canManageOrder(me, order))) throw new HttpError(403, "Bạn không có quyền xem chứng từ của đơn này.");
  return db.select({
    id: orderProofs.id, receiptId: orderProofs.receiptId, originalName: orderProofs.originalName, mimeType: orderProofs.mimeType,
    size: orderProofs.size, createdAt: orderProofs.createdAt, uploaderName: uploader.name,
  }).from(orderProofs).leftJoin(uploader, eq(orderProofs.uploadedById, uploader.id))
    .where(eq(orderProofs.orderId, orderId)).orderBy(asc(orderProofs.createdAt));
}

export async function listReceiptEvents(me: CurrentUser, orderId: number) {
  const order = await getOrderForAction(orderId);
  if (me.role === "site" && !(await canManageOrder(me, order))) throw new HttpError(403, "Bạn không có quyền xem lịch sử nhận hàng của đơn này.");
  const events = await db.select({
    id: orderReceipts.id, sequence: orderReceipts.sequence, receivedAt: orderReceipts.receivedAt,
    note: orderReceipts.note, isFinal: orderReceipts.isFinal, receivedByName: receiver.name,
  }).from(orderReceipts).leftJoin(receiver, eq(orderReceipts.receivedById, receiver.id))
    .where(eq(orderReceipts.orderId, orderId)).orderBy(asc(orderReceipts.sequence));
  return Promise.all(events.map(async (event) => ({
    ...event,
    items: await db.select({
      orderItemId: orderReceiptItems.orderItemId, name: materials.name, unit: materials.unit,
      qty: orderReceiptItems.qty, amount: orderReceiptItems.amount,
    }).from(orderReceiptItems)
      .innerJoin(orderItems, eq(orderReceiptItems.orderItemId, orderItems.id))
      .innerJoin(materials, eq(orderItems.materialId, materials.id))
      .where(eq(orderReceiptItems.receiptId, event.id)),
  })));
}

export async function addProofs(me: CurrentUser, orderId: number, files: Express.Multer.File[]) {
  if (!files.length) throw new HttpError(400, "Vui lòng chọn ít nhất một ảnh hoặc PDF.");
  try {
    const order = await getOrderForAction(orderId);
    if (!(await canManageOrder(me, order))) throw new HttpError(403, "Bạn không có quyền thêm chứng từ cho đơn này.");
    if (order.status !== "approved" && !(order.status === "delivered" && me.role === "admin")) {
      throw new HttpError(409, "Chỉ đơn đã duyệt hoặc đã nhận hàng mới được cập nhật chứng từ.");
    }
    const [{ value: existingCount }] = await db.select({ value: count() }).from(orderProofs)
      .where(and(eq(orderProofs.orderId, orderId), isNull(orderProofs.receiptId)));
    if (Number(existingCount) + files.length > 10) throw new HttpError(400, "Mỗi đợt nhận chỉ được tải tối đa 10 tệp mới.");
    const verified = await Promise.all(files.map(async (file) => {
      const detected = await fileTypeFromFile(file.path);
      if (!detected || !allowedMimeTypes.has(detected.mime)) throw new HttpError(400, `Tệp “${file.originalname}” không phải JPG, PNG, WebP hoặc PDF hợp lệ.`);
      return { file, mimeType: detected.mime };
    }));
    await db.transaction(async (tx) => {
      await tx.insert(orderProofs).values(verified.map(({ file, mimeType }) => ({
        orderId, originalName: file.originalname.slice(0, 255), storedName: file.filename,
        mimeType, size: file.size, uploadedById: me.id,
      })));
      await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.proof_added", entityType: "order", entityId: orderId,
        summary: `${me.name} đã thêm ${files.length} chứng từ cho đơn ${order.code}.` });
    });
  } catch (error) {
    await Promise.all(files.map((file) => safelyUnlink(file.path)));
    throw error;
  }
  return listProofs(me, orderId);
}

export async function getProofFile(me: CurrentUser, orderId: number, proofId: number) {
  const order = await getOrderForAction(orderId);
  if (me.role === "site" && !(await canManageOrder(me, order))) throw new HttpError(403, "Bạn không có quyền xem chứng từ của đơn này.");
  const [proof] = await db.select().from(orderProofs).where(and(eq(orderProofs.id, proofId), eq(orderProofs.orderId, orderId)));
  if (!proof) throw new HttpError(404, "Không tìm thấy chứng từ.");
  return { ...proof, path: proofPath(proof.storedName) };
}

export async function deleteProof(me: CurrentUser, orderId: number, proofId: number) {
  const order = await getOrderForAction(orderId);
  const [proof] = await db.select().from(orderProofs).where(and(eq(orderProofs.id, proofId), eq(orderProofs.orderId, orderId)));
  if (!proof) throw new HttpError(404, "Không tìm thấy chứng từ.");
  const creatorCanDelete = order.status === "approved" && !proof.receiptId && me.role === "site" && await canManageOrder(me, order);
  if (me.role !== "admin" && !creatorCanDelete) throw new HttpError(403, "Sau khi ghi nhận một đợt, chỉ Admin được xóa chứng từ của đợt đó.");
  await db.transaction(async (tx) => {
    await tx.delete(orderProofs).where(eq(orderProofs.id, proofId));
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.proof_deleted", entityType: "order", entityId: orderId,
      summary: `${me.name} đã xóa chứng từ “${proof.originalName}” khỏi đơn ${order.code}.` });
  });
  await safelyUnlink(proofPath(proof.storedName));
}

type ReceiptInput = {
  note?: string;
  receivedDate?: string;
  clientToken?: string;
  items?: { orderItemId: number; qty: number }[];
};

function receiptDate(value?: string) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new HttpError(400, "Ngày nhận hàng không hợp lệ.");
  const result = new Date(`${text}T12:00:00+07:00`);
  if (Number.isNaN(result.getTime())) throw new HttpError(400, "Ngày nhận hàng không hợp lệ.");
  const dateKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const normalized = dateKey(result);
  const today = dateKey(new Date());
  if (normalized !== text) throw new HttpError(400, "Ngày nhận hàng không hợp lệ.");
  if (text > today) throw new HttpError(400, "Ngày nhận hàng không được ở tương lai.");
  return result;
}

export async function confirmReceipt(me: CurrentUser, orderId: number, input: ReceiptInput) {
  let recipientIds: string[] = [];
  let notificationTitle = "";
  let notificationBody = "";
  let duplicate = false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new HttpError(404, "Không tìm thấy đơn.");
    if (!(await canManageOrder(me, order))) throw new HttpError(403, "Chỉ người tạo, kỹ thuật phụ trách công trình hoặc Admin được xác nhận nhận hàng.");
    const clientToken = String(input.clientToken ?? "").trim();
    if (!clientToken || clientToken.length > 100) throw new HttpError(400, "Phiên xác nhận không hợp lệ. Vui lòng tải lại trang.");
    const [existingEvent] = await tx.select({ id: orderReceipts.id, orderId: orderReceipts.orderId }).from(orderReceipts).where(eq(orderReceipts.clientToken, clientToken));
    if (existingEvent) {
      if (existingEvent.orderId !== orderId) throw new HttpError(409, "Phiên xác nhận đã được sử dụng cho đơn khác.");
      duplicate = true;
      return;
    }
    if (order.status === "delivered") throw new HttpError(409, "Đơn này đã nhận đủ hàng.");
    if (order.status !== "approved") throw new HttpError(409, "Đơn phải được duyệt trước khi xác nhận nhận hàng.");
    const [{ value: proofCount }] = await tx.select({ value: count() }).from(orderProofs)
      .where(and(eq(orderProofs.orderId, orderId), isNull(orderProofs.receiptId)));
    if (!Number(proofCount)) throw new HttpError(400, "Mỗi đợt nhận cần ít nhất một ảnh hoặc PDF mới.");
    const receivedAt = receiptDate(input.receivedDate);
    const orderedItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const previousRows = await tx.select({
      orderItemId: orderReceiptItems.orderItemId,
      qty: sql<string>`coalesce(sum(${orderReceiptItems.qty}), 0)`,
    }).from(orderReceiptItems).innerJoin(orderReceipts, eq(orderReceiptItems.receiptId, orderReceipts.id))
      .where(eq(orderReceipts.orderId, orderId)).groupBy(orderReceiptItems.orderItemId);
    const previous = new Map(previousRows.map((row) => [row.orderItemId, Number(row.qty)]));
    const requested = new Map<number, number>();
    for (const item of input.items ?? []) {
      const id = Number(item.orderItemId);
      const qty = Number(item.qty);
      if (!Number.isInteger(id) || !Number.isFinite(qty) || qty < 0) throw new HttpError(400, "Số lượng nhận không hợp lệ.");
      if (qty > 0) requested.set(id, (requested.get(id) ?? 0) + qty);
    }
    if (!requested.size) throw new HttpError(400, "Vui lòng nhập số lượng thực nhận của ít nhất một vật tư.");
    const receiptItems = orderedItems.flatMap((item) => {
      const qty = requested.get(item.id) ?? 0;
      const remaining = Number(item.qty) - (previous.get(item.id) ?? 0);
      if (qty > remaining + 0.0005) throw new HttpError(400, `Số lượng nhận vượt quá phần còn lại của vật tư trong đơn.`);
      return qty > 0 ? [{ item, qty, amount: qty * Number(item.unitPrice) }] : [];
    });
    if (receiptItems.length !== requested.size) throw new HttpError(400, "Đơn có vật tư không hợp lệ.");
    const isFinal = orderedItems.every((item) => (previous.get(item.id) ?? 0) + (requested.get(item.id) ?? 0) >= Number(item.qty) - 0.0005);
    const [{ value: eventCount }] = await tx.select({ value: count() }).from(orderReceipts).where(eq(orderReceipts.orderId, orderId));
    const sequence = Number(eventCount) + 1;
    const [event] = await tx.insert(orderReceipts).values({
      orderId, sequence, receivedAt, receivedById: me.id,
      note: String(input.note ?? "").trim().slice(0, 2000) || null,
      isFinal, clientToken,
    }).returning({ id: orderReceipts.id });
    await tx.insert(orderReceiptItems).values(receiptItems.map(({ item, qty, amount }) => ({
      receiptId: event.id, orderItemId: item.id, qty: qty.toFixed(3), amount: amount.toFixed(2),
    })));
    await tx.update(orderProofs).set({ receiptId: event.id })
      .where(and(eq(orderProofs.orderId, orderId), isNull(orderProofs.receiptId)));
    if (!order.legacyActualPosted) {
      for (const { item, qty, amount } of receiptItems) await tx.insert(projectMaterialActual).values({
        projectId: order.projectId, materialId: item.materialId, qty: qty.toFixed(3), amount: amount.toFixed(2), updatedAt: receivedAt,
      }).onConflictDoUpdate({
        target: [projectMaterialActual.projectId, projectMaterialActual.materialId],
        set: { qty: sql`${projectMaterialActual.qty} + ${qty.toFixed(3)}`, amount: sql`${projectMaterialActual.amount} + ${amount.toFixed(2)}`, updatedAt: receivedAt },
      });
    }
    await tx.update(orders).set({
      status: isFinal ? "delivered" : "approved", deliveredAt: isFinal ? receivedAt : null, receivedById: me.id,
      receiptNote: String(input.note ?? "").trim().slice(0, 2000) || null, actualPostedAt: order.actualPostedAt ?? receivedAt,
    }).where(eq(orders.id, orderId));
    const recipients = await tx.select({ id: user.id }).from(user).where(sql`${user.role} IN ('admin', 'accountant')`);
    recipientIds = [...new Set(recipients.map((row) => row.id).filter((id) => id !== me.id))];
    if (recipientIds.length) await tx.insert(notifications).values(recipientIds.map((userId) => ({
      userId, title: isFinal ? `Đơn ${order.code} đã nhận đủ hàng` : `Đơn ${order.code} nhận hàng đợt ${sequence}`,
      message: `${me.name} đã ghi nhận đợt ${sequence}${isFinal ? " và hoàn tất đơn" : ""}.`, orderId,
    })));
    notificationTitle = isFinal ? `Đơn ${order.code} đã nhận đủ hàng` : `Đơn ${order.code} nhận hàng đợt ${sequence}`;
    notificationBody = `${me.name} đã ghi nhận đợt ${sequence}${isFinal ? " và hoàn tất đơn" : ""}.`;
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.received", entityType: "order", entityId: orderId,
      summary: `${me.name} đã ghi nhận nhận hàng đợt ${sequence} cho đơn ${order.code}${isFinal ? " và hoàn tất đơn" : ""}.` });
  });
  if (!duplicate) await sendPushNotifications(recipientIds, { title: notificationTitle, body: notificationBody, url: `/orders/${orderId}`, tag: `order-received-${orderId}-${Date.now()}` });
}

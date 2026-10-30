import { basename, resolve } from "node:path";
import { unlink } from "node:fs/promises";
import { fileTypeFromFile } from "file-type";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  notifications, orderItems, orderProofs, orders, projectMaterialActual, projects, user,
  type UserRole,
} from "../db/schema.js";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { logActivity } from "./activity-service.js";

type CurrentUser = { id: string; name: string; role: UserRole };
const creator = alias(user, "receipt_creator");
const uploader = alias(user, "proof_uploader");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function canManageOrder(me: CurrentUser, createdById: string) {
  return me.role === "admin" || (me.role === "site" && me.id === createdById);
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
    ? and(eq(orders.status, "approved"), eq(orders.createdById, me.id))
    : eq(orders.status, "approved");
  return db.select({
    id: orders.id, code: orders.code, projectName: projects.name, creatorName: creator.name,
    approvedAt: orders.approvedAt, total: orders.total, proofCount: count(orderProofs.id),
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
  if (me.role === "site" && order.createdById !== me.id) throw new HttpError(403, "Bạn không có quyền xem chứng từ của đơn này.");
  return db.select({
    id: orderProofs.id, originalName: orderProofs.originalName, mimeType: orderProofs.mimeType,
    size: orderProofs.size, createdAt: orderProofs.createdAt, uploaderName: uploader.name,
  }).from(orderProofs).leftJoin(uploader, eq(orderProofs.uploadedById, uploader.id))
    .where(eq(orderProofs.orderId, orderId)).orderBy(asc(orderProofs.createdAt));
}

export async function addProofs(me: CurrentUser, orderId: number, files: Express.Multer.File[]) {
  if (!files.length) throw new HttpError(400, "Vui lòng chọn ít nhất một ảnh hoặc PDF.");
  try {
    const order = await getOrderForAction(orderId);
    if (!canManageOrder(me, order.createdById)) throw new HttpError(403, "Bạn không có quyền thêm chứng từ cho đơn này.");
    if (order.status !== "approved" && !(order.status === "delivered" && me.role === "admin")) {
      throw new HttpError(409, "Chỉ đơn đã duyệt hoặc đã nhận hàng mới được cập nhật chứng từ.");
    }
    const [{ value: existingCount }] = await db.select({ value: count() }).from(orderProofs).where(eq(orderProofs.orderId, orderId));
    if (Number(existingCount) + files.length > 10) throw new HttpError(400, "Mỗi đơn chỉ được lưu tối đa 10 tệp.");
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
  if (me.role === "site" && order.createdById !== me.id) throw new HttpError(403, "Bạn không có quyền xem chứng từ của đơn này.");
  const [proof] = await db.select().from(orderProofs).where(and(eq(orderProofs.id, proofId), eq(orderProofs.orderId, orderId)));
  if (!proof) throw new HttpError(404, "Không tìm thấy chứng từ.");
  return { ...proof, path: proofPath(proof.storedName) };
}

export async function deleteProof(me: CurrentUser, orderId: number, proofId: number) {
  const order = await getOrderForAction(orderId);
  const creatorCanDelete = order.status === "approved" && me.role === "site" && order.createdById === me.id;
  if (me.role !== "admin" && !creatorCanDelete) throw new HttpError(403, "Sau khi xác nhận, chỉ Admin được xóa chứng từ.");
  const [proof] = await db.select().from(orderProofs).where(and(eq(orderProofs.id, proofId), eq(orderProofs.orderId, orderId)));
  if (!proof) throw new HttpError(404, "Không tìm thấy chứng từ.");
  await db.transaction(async (tx) => {
    await tx.delete(orderProofs).where(eq(orderProofs.id, proofId));
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.proof_deleted", entityType: "order", entityId: orderId,
      summary: `${me.name} đã xóa chứng từ “${proof.originalName}” khỏi đơn ${order.code}.` });
  });
  await safelyUnlink(proofPath(proof.storedName));
}

export async function confirmReceipt(me: CurrentUser, orderId: number, note: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new HttpError(404, "Không tìm thấy đơn.");
    if (!canManageOrder(me, order.createdById)) throw new HttpError(403, "Chỉ người tạo đơn hoặc Admin được xác nhận nhận hàng.");
    if (order.status === "delivered") throw new HttpError(409, "Đơn này đã được xác nhận nhận hàng.");
    if (order.status !== "approved") throw new HttpError(409, "Đơn phải được duyệt trước khi xác nhận nhận hàng.");
    const [{ value: proofCount }] = await tx.select({ value: count() }).from(orderProofs).where(eq(orderProofs.orderId, orderId));
    if (!Number(proofCount)) throw new HttpError(400, "Vui lòng tải ít nhất một ảnh hoặc PDF xác thực trước khi xác nhận.");
    const receivedAt = new Date();
    if (!order.actualPostedAt) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) await tx.insert(projectMaterialActual).values({
        projectId: order.projectId, materialId: item.materialId, qty: item.qty, amount: item.amount, updatedAt: receivedAt,
      }).onConflictDoUpdate({
        target: [projectMaterialActual.projectId, projectMaterialActual.materialId],
        set: { qty: sql`${projectMaterialActual.qty} + ${item.qty}`, amount: sql`${projectMaterialActual.amount} + ${item.amount}`, updatedAt: receivedAt },
      });
    }
    await tx.update(orders).set({
      status: "delivered", deliveredAt: receivedAt, receivedById: me.id,
      receiptNote: note.trim().slice(0, 2000) || null, actualPostedAt: order.actualPostedAt ?? receivedAt,
    }).where(eq(orders.id, orderId));
    const recipients = await tx.select({ id: user.id }).from(user).where(sql`${user.role} IN ('admin', 'accountant')`);
    const recipientIds = [...new Set(recipients.map((row) => row.id).filter((id) => id !== me.id))];
    if (recipientIds.length) await tx.insert(notifications).values(recipientIds.map((userId) => ({
      userId, title: `Đơn ${order.code} đã nhận hàng`, message: `${me.name} đã xác nhận nhận hàng và bổ sung chứng từ.`, orderId,
    })));
    await logActivity(tx, { actorId: me.id, actorName: me.name, action: "order.received", entityType: "order", entityId: orderId,
      summary: `${me.name} đã xác nhận nhận hàng cho đơn ${order.code}. Số liệu thực tế được ghi nhận một lần.` });
  });
}

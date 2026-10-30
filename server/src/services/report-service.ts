import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { budgets, materials, orderItems, orders, projectMaterialActual, projectSupplierContacts, projects, supplierContacts, user, type UserRole } from "../db/schema.js";
import { monthRange, toNumber } from "../lib/utils.js";

type CurrentUser = { id: string; role: UserRole };

export async function materialCosts(month?: string, projectId?: number) {
  const range = monthRange(month);
  const conditions = [gte(orders.actualPostedAt, range.start), lt(orders.actualPostedAt, range.end)];
  if (projectId) conditions.push(eq(orders.projectId, projectId));
  const rows = await db.select({ materialId: materials.id, name: materials.name, unit: materials.unit, group: materials.group,
    qty: sql<string>`coalesce(sum(${orderItems.qty}), 0)`, amount: sql<string>`coalesce(sum(${orderItems.amount}), 0)` })
    .from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).innerJoin(materials, eq(orderItems.materialId, materials.id))
    .where(and(...conditions)).groupBy(materials.id, materials.name, materials.unit, materials.group).orderBy(asc(materials.group), asc(materials.name));
  return { range, rows: rows.map((row) => ({ ...row, qty: toNumber(row.qty), amount: toNumber(row.amount) })) };
}

export async function getReport(month?: string, projectId?: number) {
  const [{ range, rows }, projectRows] = await Promise.all([
    materialCosts(month, projectId),
    db.select({ id: projects.id, name: projects.name, code: projects.code }).from(projects).orderBy(asc(projects.name)),
  ]);
  const groups = new Map<string, number>();
  for (const row of rows) groups.set(row.group, (groups.get(row.group) ?? 0) + row.amount);
  return { month: range.value, label: range.label, projects: projectRows, materialStats: rows,
    totalCost: rows.reduce((sum, row) => sum + row.amount, 0),
    groupData: Array.from(groups, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) };
}

export async function getReconcile(projectId?: number) {
  const projectRows = await db.select({ id: projects.id, name: projects.name, code: projects.code }).from(projects).orderBy(asc(projects.name));
  const selectedId = projectId || projectRows[0]?.id;
  if (!selectedId) return { projects: [], selectedId: null, rows: [], totalBudget: 0, totalActual: 0, totalDiff: 0 };
  const [budgetRows, actualRows] = await Promise.all([
    db.select({ materialId: budgets.materialId, name: materials.name, unit: materials.unit, group: materials.group, qty: budgets.qty, unitPrice: budgets.unitPrice })
      .from(budgets).innerJoin(materials, eq(budgets.materialId, materials.id)).where(eq(budgets.projectId, selectedId)),
    db.select({ materialId: projectMaterialActual.materialId, name: materials.name, unit: materials.unit, group: materials.group,
      qty: projectMaterialActual.qty, amount: projectMaterialActual.amount }).from(projectMaterialActual)
      .innerJoin(materials, eq(projectMaterialActual.materialId, materials.id)).where(eq(projectMaterialActual.projectId, selectedId)),
  ]);
  const map = new Map<number, { materialId: number; name: string; unit: string; group: string; budgetQty: number; budgetAmount: number; actualQty: number; actualAmount: number }>();
  for (const row of budgetRows) map.set(row.materialId, { materialId: row.materialId, name: row.name, unit: row.unit, group: row.group,
    budgetQty: toNumber(row.qty), budgetAmount: toNumber(row.qty) * toNumber(row.unitPrice), actualQty: 0, actualAmount: 0 });
  for (const row of actualRows) {
    const current = map.get(row.materialId);
    if (current) { current.actualQty = toNumber(row.qty); current.actualAmount = toNumber(row.amount); }
    else map.set(row.materialId, { materialId: row.materialId, name: row.name, unit: row.unit, group: row.group,
      budgetQty: 0, budgetAmount: 0, actualQty: toNumber(row.qty), actualAmount: toNumber(row.amount) });
  }
  const rows = Array.from(map.values()).sort((a, b) => a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group));
  const totalBudget = rows.reduce((sum, row) => sum + row.budgetAmount, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.actualAmount, 0);
  return { projects: projectRows, selectedId, rows, totalBudget, totalActual, totalDiff: totalActual - totalBudget };
}

export async function getProjectSummary(me: CurrentUser, projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new Error("Không tìm thấy công trình.");
  const ownOrderScope = me.role === "site" ? eq(orders.createdById, me.id) : undefined;
  const [reconcile, statusRows, recentOrders, linked] = await Promise.all([
    getReconcile(projectId),
    db.select({ status: orders.status, value: count() }).from(orders).where(ownOrderScope ? and(eq(orders.projectId, projectId), ownOrderScope) : eq(orders.projectId, projectId)).groupBy(orders.status),
    db.select({ id: orders.id, code: orders.code, status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders).where(ownOrderScope ? and(eq(orders.projectId, projectId), ownOrderScope) : eq(orders.projectId, projectId)).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ id: supplierContacts.id, name: supplierContacts.name, phone: supplierContacts.phone }).from(projectSupplierContacts).innerJoin(supplierContacts, eq(projectSupplierContacts.supplierContactId, supplierContacts.id)).where(eq(projectSupplierContacts.projectId, projectId)),
  ]);
  const defaultSupplier = linked.find((item) => item.id === project.defaultSupplierContactId) ?? null;
  return { project, totalBudget: reconcile.totalBudget, totalActual: reconcile.totalActual, totalDiff: reconcile.totalDiff, statusRows, recentOrders: recentOrders.map((row) => ({ ...row, total: toNumber(row.total) })), suppliers: linked, defaultSupplier,
    neededMaterials: reconcile.rows.filter((row) => row.budgetQty > row.actualQty).map((row) => ({ ...row, remainingQty: row.budgetQty - row.actualQty })) };
}

export async function getDashboard(me: CurrentUser) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const ownOrderScope = me.role === "site" ? eq(orders.createdById, me.id) : undefined;
  const pendingWhere = ownOrderScope ? and(eq(orders.status, "pending"), ownOrderScope) : eq(orders.status, "pending");
  const awaitingReceiptWhere = ownOrderScope ? and(eq(orders.status, "approved"), ownOrderScope) : eq(orders.status, "approved");
  const receivedMonthWhere = ownOrderScope
    ? and(gte(orders.actualPostedAt, monthStart), ownOrderScope)
    : gte(orders.actualPostedAt, monthStart);
  const [[projectCount], [pendingCount], [awaitingReceiptCount], [receivedMonth], [materialCount], statusRows] = await Promise.all([
    db.select({ value: count() }).from(projects), db.select({ value: count() }).from(orders).where(pendingWhere),
    db.select({ value: count() }).from(orders).where(awaitingReceiptWhere),
    db.select({ value: sql<string>`coalesce(sum(${orders.total}), 0)` }).from(orders).where(receivedMonthWhere),
    db.select({ value: count() }).from(materials),
    db.select({ status: orders.status, value: count() }).from(orders).where(ownOrderScope).groupBy(orders.status),
  ]);
  const createdBy = alias(user, "dashboard_creator");
  const recentOrders = await db.select({ id: orders.id, code: orders.code, status: orders.status, total: orders.total,
    createdAt: orders.createdAt, projectName: projects.name, creatorName: createdBy.name }).from(orders)
    .innerJoin(projects, eq(orders.projectId, projects.id)).innerJoin(createdBy, eq(orders.createdById, createdBy.id))
    .where(ownOrderScope)
    .orderBy(desc(orders.createdAt)).limit(6);
  return { projectCount: projectCount.value, pendingCount: pendingCount.value, awaitingReceiptCount: awaitingReceiptCount.value,
    materialCount: materialCount.value, receivedMonth: toNumber(receivedMonth.value), statusRows, recentOrders };
}

function csvCell(value: string | number) { const text = String(value ?? ""); return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
export async function exportReport(month?: string, projectId?: number) {
  const report = await getReport(month, projectId);
  const lines = [`Thống kê chi phí vật tư - Tháng ${report.label}`, "", ["Vật tư", "Nhóm", "Số lượng", "Đơn vị", "Thành tiền (VND)"].map(csvCell).join(",")];
  for (const row of report.materialStats) lines.push([row.name, row.group, row.qty, row.unit, Math.round(row.amount)].map(csvCell).join(","));
  lines.push(["Tổng chi phí", "", "", "", Math.round(report.totalCost)].map(csvCell).join(","));
  return { csv: "﻿" + lines.join("\r\n"), filename: `thong-ke-${report.label.replace("/", "-")}.csv` };
}

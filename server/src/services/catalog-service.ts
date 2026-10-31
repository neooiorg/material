import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { budgets, materials, projectSupplierContacts, projectTechnicians, projects, supplierContacts, user, type ProjectStatus } from "../db/schema.js";
import { toNumber } from "../lib/utils.js";
import { logActivity } from "./activity-service.js";

type Actor = { id: string; name: string };

export async function getOrderOptions() {
  const [projectRows, materialRows, priceRows, contacts, links] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.name)),
    db.select().from(materials).orderBy(asc(materials.group), asc(materials.name)),
    db.select({ materialId: budgets.materialId, unitPrice: budgets.unitPrice }).from(budgets),
    db.select().from(supplierContacts).orderBy(asc(supplierContacts.name)),
    db.select().from(projectSupplierContacts),
  ]);
  const suggestedPrices: Record<number, number> = {};
  for (const row of priceRows) if (suggestedPrices[row.materialId] === undefined) suggestedPrices[row.materialId] = Number(row.unitPrice);
  const projectContacts = Object.fromEntries(projectRows.map((project) => [project.id, links.filter((link) => link.projectId === project.id).map((link) => link.supplierContactId)]));
  return { projects: projectRows, materials: materialRows, suggestedPrices, contacts, projectContacts };
}

export async function listProjects() { return db.select().from(projects).orderBy(asc(projects.name)); }
export async function listTechnicians() { return db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.role, "site")).orderBy(asc(user.name)); }
export async function listMaterials() { return db.select().from(materials).orderBy(asc(materials.group), asc(materials.name)); }
export async function listSupplierContacts() { return db.select().from(supplierContacts).orderBy(asc(supplierContacts.name)); }
function cleanPhone(value: string) {
  const phone = value.replace(/[^0-9+]/g, "");
  if (!/^(0|\+84)\d{9,10}$/.test(phone)) throw new Error("Số Zalo Việt Nam không hợp lệ.");
  return phone;
}
export async function createSupplierContact(actor: Actor, input: { name: string; phone: string }) {
  if (!input.name?.trim()) throw new Error("Tên đơn vị cung cấp là bắt buộc.");
  await db.insert(supplierContacts).values({ name: input.name.trim(), phone: cleanPhone(input.phone) });
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "supplierContact.created", entityType: "supplierContact", summary: `${actor.name} thêm đơn vị cung cấp "${input.name.trim()}".` });
}
export async function updateSupplierContact(actor: Actor, id: number, input: { name: string; phone: string }) {
  if (!input.name?.trim()) throw new Error("Tên đơn vị cung cấp là bắt buộc.");
  await db.update(supplierContacts).set({ name: input.name.trim(), phone: cleanPhone(input.phone), updatedAt: new Date() }).where(eq(supplierContacts.id, id));
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "supplierContact.updated", entityType: "supplierContact", entityId: id, summary: `${actor.name} cập nhật đơn vị cung cấp "${input.name.trim()}".` });
}
export async function deleteSupplierContact(actor: Actor, id: number) { await db.delete(supplierContacts).where(eq(supplierContacts.id, id)); await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "supplierContact.deleted", entityType: "supplierContact", entityId: id, summary: `${actor.name} xóa một đơn vị cung cấp.` }); }

async function setProjectContacts(projectId: number, defaultId: number | null | undefined, ids: number[] | undefined) {
  const contactIds = Array.from(new Set((ids ?? []).filter(Number)));
  if (defaultId && !contactIds.includes(defaultId)) throw new Error("Đơn vị mặc định phải thuộc danh sách liên quan.");
  await db.transaction(async (tx) => {
    await tx.delete(projectSupplierContacts).where(eq(projectSupplierContacts.projectId, projectId));
    if (contactIds.length) await tx.insert(projectSupplierContacts).values(contactIds.map((supplierContactId) => ({ projectId, supplierContactId })));
    await tx.update(projects).set({ defaultSupplierContactId: defaultId || null }).where(eq(projects.id, projectId));
  });
}

async function setProjectTechnicians(projectId: number, ids: string[] | undefined) {
  if (ids === undefined) return;
  const selected = [...new Set(ids.filter((id): id is string => typeof id === "string" && Boolean(id)))];
  const valid = selected.length ? await db.select({ id: user.id }).from(user).where(inArray(user.id, selected)) : [];
  if (valid.length !== selected.length) throw new Error("Danh sách kỹ thuật không hợp lệ.");
  const siteUsers = selected.length ? await db.select({ id: user.id }).from(user).where(eq(user.role, "site")) : [];
  const siteIds = new Set(siteUsers.map((item) => item.id));
  if (selected.some((id) => !siteIds.has(id))) throw new Error("Chỉ tài khoản kỹ thuật được phân công công trình.");
  await db.transaction(async (tx) => {
    await tx.delete(projectTechnicians).where(eq(projectTechnicians.projectId, projectId));
    if (selected.length) await tx.insert(projectTechnicians).values(selected.map((userId) => ({ projectId, userId })));
  });
}

export async function createProject(actor: Actor, input: { code: string; name: string; address?: string; status?: ProjectStatus; defaultSupplierContactId?: number | null; supplierContactIds?: number[]; technicianIds?: string[] }) {
  if (!input.code?.trim() || !input.name?.trim()) throw new Error("Mã và tên công trình là bắt buộc.");
  const [created] = await db.insert(projects).values({ code: input.code.trim(), name: input.name.trim(), address: input.address?.trim() || null, status: input.status ?? "active" }).returning({ id: projects.id });
  await setProjectContacts(created.id, input.defaultSupplierContactId, input.supplierContactIds);
  await setProjectTechnicians(created.id, input.technicianIds);
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "project.created", entityType: "project", summary: `${actor.name} thêm công trình "${input.name.trim()}" (${input.code.trim()}).` });
}
export async function updateProject(actor: Actor, id: number, input: { code: string; name: string; address?: string; status: ProjectStatus; defaultSupplierContactId?: number | null; supplierContactIds?: number[]; technicianIds?: string[] }) {
  await db.update(projects).set({ code: input.code.trim(), name: input.name.trim(), address: input.address?.trim() || null, status: input.status }).where(eq(projects.id, id));
  if (input.defaultSupplierContactId !== undefined || input.supplierContactIds !== undefined) await setProjectContacts(id, input.defaultSupplierContactId, input.supplierContactIds);
  await setProjectTechnicians(id, input.technicianIds);
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "project.updated", entityType: "project", entityId: id, summary: `${actor.name} sửa công trình "${input.name.trim()}" (${input.code.trim()}).` });
}
export async function deleteProject(actor: Actor, id: number) {
  const [existing] = await db.select({ code: projects.code, name: projects.name }).from(projects).where(eq(projects.id, id));
  await db.delete(projects).where(eq(projects.id, id));
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "project.deleted", entityType: "project", summary: `${actor.name} xóa công trình "${existing?.name ?? ""}" (${existing?.code ?? id}).` });
}
export async function createMaterial(actor: Actor, input: { code: string; name: string; unit: string; group: string }) {
  if (!input.code?.trim() || !input.name?.trim() || !input.unit?.trim()) throw new Error("Mã, tên và đơn vị tính là bắt buộc.");
  await db.insert(materials).values({ code: input.code.trim(), name: input.name.trim(), unit: input.unit.trim(), group: input.group?.trim() || "Khác" });
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "material.created", entityType: "material", summary: `${actor.name} thêm vật tư "${input.name.trim()}" (${input.code.trim()}).` });
}
export async function updateMaterial(actor: Actor, id: number, input: { code: string; name: string; unit: string; group: string }) {
  await db.update(materials).set({ code: input.code.trim(), name: input.name.trim(), unit: input.unit.trim(), group: input.group?.trim() || "Khác" }).where(eq(materials.id, id));
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "material.updated", entityType: "material", entityId: id, summary: `${actor.name} sửa vật tư "${input.name.trim()}" (${input.code.trim()}).` });
}
export async function deleteMaterial(actor: Actor, id: number) {
  const [existing] = await db.select({ code: materials.code, name: materials.name }).from(materials).where(eq(materials.id, id));
  await db.delete(materials).where(eq(materials.id, id));
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "material.deleted", entityType: "material", summary: `${actor.name} xóa vật tư "${existing?.name ?? ""}" (${existing?.code ?? id}).` });
}

export async function listBudgets(projectId: number) {
  return db.select({ id: budgets.id, materialId: budgets.materialId, name: materials.name, unit: materials.unit,
    group: materials.group, qty: budgets.qty, unitPrice: budgets.unitPrice }).from(budgets)
    .innerJoin(materials, eq(budgets.materialId, materials.id)).where(eq(budgets.projectId, projectId))
    .orderBy(asc(materials.group), asc(materials.name));
}
export async function upsertBudget(actor: Actor, input: { projectId: number; materialId: number; qty: number; unitPrice: number }) {
  if (!input.projectId || !input.materialId) throw new Error("Vui lòng chọn công trình và vật tư.");
  await db.insert(budgets).values({ projectId: input.projectId, materialId: input.materialId, qty: toNumber(input.qty).toFixed(3), unitPrice: toNumber(input.unitPrice).toFixed(2) })
    .onConflictDoUpdate({ target: [budgets.projectId, budgets.materialId], set: { qty: toNumber(input.qty).toFixed(3), unitPrice: toNumber(input.unitPrice).toFixed(2) } });
  const [[project], [material]] = await Promise.all([
    db.select({ name: projects.name }).from(projects).where(eq(projects.id, input.projectId)),
    db.select({ name: materials.name }).from(materials).where(eq(materials.id, input.materialId)),
  ]);
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "budget.upserted", entityType: "budget", summary: `${actor.name} cập nhật dự toán "${material?.name ?? ""}" cho công trình "${project?.name ?? ""}".` });
}
export async function deleteBudget(actor: Actor, id: number) {
  await db.delete(budgets).where(eq(budgets.id, id));
  await logActivity(db, { actorId: actor.id, actorName: actor.name, action: "budget.deleted", entityType: "budget", summary: `${actor.name} xóa một dòng dự toán.` });
}

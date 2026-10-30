import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "director", "site", "supplier", "accountant"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "paused", "completed"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "approved", "rejected", "delivered"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("site"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"), scope: text("scope"), password: text("password"),
  createdAt: timestamp("created_at").notNull(), updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(), createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(),
  address: text("address"), status: projectStatusEnum("status").notNull().default("active"),
  defaultSupplierContactId: integer("default_supplier_contact_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierContacts = pgTable("supplier_contacts", {
  id: serial("id").primaryKey(), name: text("name").notNull(), phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectSupplierContacts = pgTable("project_supplier_contacts", {
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplierContactId: integer("supplier_contact_id").notNull().references(() => supplierContacts.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("project_supplier_contacts_uq").on(table.projectId, table.supplierContactId)]);

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(),
  unit: text("unit").notNull(), group: text("group").notNull(), createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("budgets_project_material_uq").on(table.projectId, table.materialId)]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(), code: text("code").notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  supplierContactId: integer("supplier_contact_id").references(() => supplierContacts.id, { onDelete: "set null" }),
  supplierId: text("supplier_id").references(() => user.id, { onDelete: "set null" }),
  createdById: text("created_by_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  status: orderStatusEnum("status").notNull().default("pending"), note: text("note"),
  total: numeric("total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(), approvedAt: timestamp("approved_at"),
  approvedById: text("approved_by_id").references(() => user.id, { onDelete: "set null" }),
  rejectedReason: text("rejected_reason"), deliveredAt: timestamp("delivered_at"),
  receivedById: text("received_by_id").references(() => user.id, { onDelete: "set null" }),
  receiptNote: text("receipt_note"),
  actualPostedAt: timestamp("actual_posted_at"),
});

export const orderProofs = pgTable("order_proofs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedById: text("uploaded_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "restrict" }),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
});

export const projectMaterialActual = pgTable("project_material_actual", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull().default("0"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("pma_project_material_uq").on(table.projectId, table.materialId)]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(), message: text("message").notNull(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false), createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(), supplierId: text("supplier_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"), note: text("note"),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(), actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(), action: text("action").notNull(), entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"), summary: text("summary").notNull(), createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UserRole = (typeof roleEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

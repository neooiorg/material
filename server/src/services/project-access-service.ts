import { eq, exists, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, projectTechnicians } from "../db/schema.js";

export function siteOrderScope(userId: string) {
  return or(
    eq(orders.createdById, userId),
    exists(db.select({ value: sql`1` }).from(projectTechnicians).where(
      sql`${projectTechnicians.projectId} = ${orders.projectId} AND ${projectTechnicians.userId} = ${userId}`,
    )),
  );
}

export async function canAccessProject(userId: string, projectId: number) {
  const [assignment] = await db.select({ userId: projectTechnicians.userId }).from(projectTechnicians)
    .where(sql`${projectTechnicians.projectId} = ${projectId} AND ${projectTechnicians.userId} = ${userId}`).limit(1);
  return Boolean(assignment);
}

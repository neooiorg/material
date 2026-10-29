"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataState, PageTitle, useApi } from "@/components/common";
import { date, money, number } from "@/lib/format";
import type { Role } from "@/lib/auth";

type Resource = "material" | "supplier-contact" | "activity" | "notification" | "budget";
type Field = { key: string; label: string; format?: (value: unknown) => string };
type Definition = { title: string; endpoint: string; fields: Field[]; backHref: string; backLabel: string };

const definitions: Record<Resource, Definition> = {
  material: { title: "Chi tiết vật tư", endpoint: "/api/materials", backHref: "/admin/materials", backLabel: "Danh sách vật tư", fields: [{ key: "code", label: "Mã vật tư" }, { key: "name", label: "Tên vật tư" }, { key: "group", label: "Nhóm" }, { key: "unit", label: "Đơn vị tính" }] },
  "supplier-contact": { title: "Chi tiết đơn vị cung cấp", endpoint: "/api/supplier-contacts", backHref: "/admin/supplier-contacts", backLabel: "Danh sách đơn vị", fields: [{ key: "name", label: "Tên đơn vị" }, { key: "phone", label: "Số Zalo" }] },
  activity: { title: "Chi tiết hoạt động", endpoint: "/api/activity", backHref: "/history", backLabel: "Nhật ký hoạt động", fields: [{ key: "entityType", label: "Loại dữ liệu" }, { key: "actorName", label: "Người thực hiện" }, { key: "action", label: "Thao tác" }, { key: "summary", label: "Nội dung" }, { key: "createdAt", label: "Thời gian", format: (value) => date(String(value)) }] },
  notification: { title: "Chi tiết thông báo", endpoint: "/api/notifications", backHref: "/notifications", backLabel: "Danh sách thông báo", fields: [{ key: "title", label: "Tiêu đề" }, { key: "message", label: "Nội dung" }, { key: "isRead", label: "Trạng thái", format: (value) => value ? "Đã đọc" : "Chưa đọc" }, { key: "createdAt", label: "Thời gian", format: (value) => date(String(value)) }] },
  budget: { title: "Chi tiết dòng dự toán", endpoint: "/api/budgets", backHref: "/admin/budgets", backLabel: "Dự toán công trình", fields: [{ key: "name", label: "Vật tư" }, { key: "unit", label: "Đơn vị" }, { key: "qty", label: "Số lượng", format: (value) => number(value as string | number | null | undefined) }, { key: "unitPrice", label: "Đơn giá", format: (value) => money(value as string | number | null | undefined) }] },
};

export function Detail({ resource, id, role }: { resource: Resource; id: number; role: Role }) {
  const projectId = useSearchParams().get("projectId");
  const definition = definitions[resource];
  const endpoint = resource === "budget" ? `${definition.endpoint}?projectId=${projectId ?? "0"}` : definition.endpoint;
  const query = useApi<Record<string, unknown>[]>(endpoint);
  const row = query.data?.find((item) => Number(item.id) === id);

  const backHref = resource === "material" && role !== "admin" ? "/projects" : definition.backHref;
  const backLabel = resource === "material" && role !== "admin" ? "Tổng hợp công trình" : definition.backLabel;
  return <><PageTitle title={definition.title} action={<Button variant="outline" render={<Link href={backHref}/>}>{backLabel}</Button>}/><DataState loading={query.loading} error={query.error} retry={query.refresh}>{row ? <Card><CardContent className="divide-y py-1">{definition.fields.map((field) => <dl key={field.key} className="grid gap-1 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6"><dt className="text-sm text-muted-foreground">{field.label}</dt><dd className="break-words text-sm font-medium">{field.format ? field.format(row[field.key]) : String(row[field.key] ?? "—")}</dd></dl>)}{resource === "notification" && typeof row.orderId === "number" && <div className="py-4"><Button variant="outline" render={<Link href={`/orders/${row.orderId}`}/>}>Mở đơn liên quan</Button></div>}</CardContent></Card> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy dữ liệu chi tiết.</CardContent></Card>}</DataState></>;
}

export type { Resource as DetailResource };

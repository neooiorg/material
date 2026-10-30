"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { date, money, number } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid, DataState, Field, NativeSelect, PageTitle, Status, useApi } from "@/components/common";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { OrderProofs, type OrderProof } from "@/components/receipts";
import { Boxes, Building2, ClipboardCheck, Truck, WalletCards } from "lucide-react";

type OrderRow = { id: number; code: string; projectName: string; creatorName: string; createdAt: string; status: string; total: string; note?: string; items?: { name: string; qty: string; unit: string }[] };
type Project = { id: number; code: string; name: string; status: string; address?: string; defaultSupplierContactId?: number | null };
type Material = { id: number; name: string; unit: string; group: string };
type Contact = { id: number; name: string; phone: string };
const statusFilterOptions = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Chờ nhận hàng" },
  { value: "rejected", label: "Từ chối" },
  { value: "delivered", label: "Đã nhận hàng" },
  { value: "active", label: "Đang thực hiện" },
  { value: "completed", label: "Hoàn thành" },
  { value: "paused", label: "Tạm dừng" },
];

export function Dashboard({ role }: { role: Role }) {
  const query = useApi<{ projectCount: number; pendingCount: number; awaitingReceiptCount: number; materialCount: number; receivedMonth: number; recentOrders: OrderRow[] }>("/api/dashboard");
  const cards = query.data ? [
    { label: "Công trình", value: query.data.projectCount, href: "/projects", detail: "Xem tổng hợp công trình", badge: "Đang theo dõi", icon: Building2 },
    { label: "Đơn chờ duyệt", value: query.data.pendingCount, href: role === "admin" ? "/approvals" : "/orders", detail: "Xem các đơn đang chờ", badge: query.data.pendingCount > 0 ? "Cần xử lý" : "Đã xử lý", icon: ClipboardCheck, urgent: query.data.pendingCount > 0 },
    { label: "Chờ nhận hàng", value: query.data.awaitingReceiptCount, href: role === "accountant" ? "/orders" : "/receipts", detail: "Đơn đã duyệt chờ xác nhận", badge: query.data.awaitingReceiptCount > 0 ? "Cần xác nhận" : "Đã xử lý", icon: Truck, urgent: query.data.awaitingReceiptCount > 0 },
    { label: "Vật tư", value: query.data.materialCount, href: role === "admin" ? "/admin/materials" : "/projects", detail: "Xem danh mục vật tư", badge: "Trong danh mục", icon: Boxes },
  ] : [];

  return <>
    <PageTitle title="Tổng quan" description="Dữ liệu cập nhật trực tiếp từ hệ thống quản lý vật tư." action={role !== "accountant" ? <Button render={<Link href="/orders/new"/>}>Tạo đơn vật tư</Button> : undefined}/>
    <DataState loading={query.loading} error={query.error} retry={query.refresh}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <DashboardStatCard key={card.label} {...card}/>)}
      </div>
      <div className="mt-4 max-w-xl">
        <DashboardStatCard
          label="Giá trị đã nhận trong tháng"
          value={money(query.data?.receivedMonth)}
          detail="Tổng giá trị đơn đã xác nhận nhận hàng"
          badge="Tháng này"
          icon={WalletCards}
          href={role === "site" ? "/orders" : "/reports"}
        />
      </div>
      <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Đơn gần đây</h2><OrderTable rows={query.data?.recentOrders ?? []}/></section>
    </DataState>
  </>;
}

function OrderTable({ rows }: { rows: OrderRow[] }) {
  return <DataGrid rows={rows} search="Tìm mã đơn, công trình, người tạo" searchText={(r) => `${r.code} ${r.projectName} ${r.creatorName}`} columns={[{ id: "code", label: "Mã đơn", accessor: (r) => r.code, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/orders/${r.id}`}>{r.code}</Link> }, { id: "project", label: "Công trình", accessor: (r) => r.projectName, filter: { type: "text" }, render: (r) => r.projectName }, { id: "creator", label: "Người tạo", accessor: (r) => r.creatorName, filter: { type: "text" }, render: (r) => r.creatorName }, { id: "createdAt", label: "Thời gian", accessor: (r) => r.createdAt, filter: { type: "date" }, render: (r) => date(r.createdAt) }, { id: "status", label: "Trạng thái", accessor: (r) => r.status, filter: { type: "select", options: statusFilterOptions }, render: (r) => <Status value={r.status}/> }, { id: "total", label: "Giá trị", accessor: (r) => Number(r.total), filter: { type: "number" }, render: (r) => money(r.total) }]}/>;
}

export function Orders({ approvals = false, canCreate = false }: { approvals?: boolean; canCreate?: boolean }) {
  const query = useApi<OrderRow[]>(approvals ? "/api/approvals" : "/api/orders");
  const [status, setStatus] = useState("all");
  const rows = (query.data ?? []).filter((row) => status === "all" || row.status === status);
  return <><PageTitle title={approvals ? "Đơn chờ duyệt" : "Đơn đặt vật tư"} description={approvals ? "Kiểm tra nội dung và duyệt hoặc từ chối từng đơn." : "Theo dõi toàn bộ đơn theo quyền truy cập."} action={canCreate ? <Button render={<Link href="/orders/new"/>}>Tạo đơn</Button> : undefined}/><div className="mb-4 max-w-xs"><NativeSelect label="Trạng thái" value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả" }, { value: "pending", label: "Chờ duyệt" }, { value: "approved", label: "Chờ nhận hàng" }, { value: "delivered", label: "Đã nhận hàng" }, { value: "rejected", label: "Từ chối" }]}/></div><DataState loading={query.loading} error={query.error} retry={query.refresh}><OrderTable rows={rows}/></DataState></>;
}

type OrderDetailData = OrderRow & { note: string | null; rejectedReason: string | null; approvedAt: string | null; deliveredAt: string | null; receivedByName: string | null; receiptNote: string | null; actualPostedAt: string | null; supplierContact: Contact | null; items: { id: number; name: string; qty: string; unit: string; unitPrice: string; amount: string }[]; timeline: { id: number; summary: string; createdAt: string }[]; proofs: OrderProof[] };
export function OrderDetail({ id, role }: { id: number; role: Role }) {
  const query = useApi<OrderDetailData>(`/api/orders/${id}`);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function decision(action: "approve" | "reject") {
    setSaving(true);
    try {
      await api(`/api/orders/${id}/${action}`, { method: "POST", ...jsonBody(action === "reject" ? { reason } : {}) });
      toast.success(action === "approve" ? "Đã duyệt đơn." : "Đã từ chối đơn.");
      query.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xử lý được đơn.");
    } finally {
      setSaving(false);
    }
  }

  function shareZalo() {
    const order = query.data;
    if (!order?.supplierContact?.phone) return;
    const lines = [`Đơn cần đặt: ${order.code}`, `Công trình: ${order.projectName}`, ...order.items.map((item) => `• ${item.name}: ${number(item.qty)} ${item.unit}`)];
    const text = encodeURIComponent(lines.join("\n"));
    const phone = order.supplierContact.phone.replace(/\D/g, "").replace(/^0/, "84");
    window.open(`https://zalo.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  const order = query.data;
  return <>
    <PageTitle title={order?.code ?? "Chi tiết đơn"} description={order ? `${order.projectName} · ${date(order.createdAt)}` : undefined} action={<Button variant="outline" render={<Link href="/orders" />}>Danh sách đơn</Button>} />
    <DataState loading={query.loading} error={query.error} retry={query.refresh}>
      {order ? <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Thông tin đơn</CardTitle><Status value={order.status} /></div></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Người tạo:</span> {order.creatorName}</p>
              <p><span className="text-muted-foreground">Đơn vị cung cấp:</span> {order.supplierContact?.name ?? "Chưa chọn"}</p>
              {order.note ? <p className="sm:col-span-2"><span className="text-muted-foreground">Ghi chú:</span> {order.note}</p> : null}
              {order.rejectedReason ? <p className="text-destructive sm:col-span-2">Lý do từ chối: {order.rejectedReason}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Vật tư</CardTitle></CardHeader>
            <CardContent>
              <DataGrid rows={order.items} columns={[
                { id: "name", label: "Tên", accessor: (row) => row.name, filter: { type: "text" }, render: (row) => row.name },
                { id: "qty", label: "Số lượng", accessor: (row) => Number(row.qty), filter: { type: "number" }, render: (row) => `${number(row.qty)} ${row.unit}` },
                { id: "unitPrice", label: "Đơn giá", accessor: (row) => Number(row.unitPrice), filter: { type: "number" }, render: (row) => money(row.unitPrice) },
                { id: "amount", label: "Thành tiền", accessor: (row) => Number(row.amount), filter: { type: "number" }, render: (row) => money(row.amount) },
              ]} />
              <p className="mt-4 text-right text-lg font-semibold">Tổng cộng: {money(order.total)}</p>
            </CardContent>
          </Card>
          <OrderProofs orderId={id} status={order.status} role={role} proofs={order.proofs ?? []} receivedAt={order.deliveredAt} receivedByName={order.receivedByName} receiptNote={order.receiptNote} onRefresh={query.refresh} />
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Thao tác</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.status === "approved" && order.supplierContact?.phone && role !== "accountant" ? <Button className="w-full" variant="outline" onClick={shareZalo}>Gửi nội dung qua Zalo</Button> : null}
              {role === "admin" && order.status === "pending" ? <>
                <Button className="w-full" disabled={saving} onClick={() => void decision("approve")}>Duyệt đơn</Button>
                <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do từ chối (không bắt buộc)" aria-label="Lý do từ chối" />
                <Button className="w-full" variant="destructive" disabled={saving} onClick={() => void decision("reject")}>Từ chối</Button>
              </> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Nhật ký đơn</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">{order.timeline.map((event) => <div key={event.id} className="border-b pb-3 last:border-0"><p>{event.summary}</p><p className="mt-1 text-xs text-muted-foreground">{date(event.createdAt)}</p></div>)}</CardContent>
          </Card>
        </div>
      </div> : null}
    </DataState>
  </>;
}

type OrderOptions = { projects: Project[]; materials: Material[]; contacts: Contact[]; projectContacts: Record<number, number[]>; suggestedPrices: Record<number, number> };
type DraftLine = { key: number; materialId: string; qty: string; unitPrice: string };
export function OrderCreate() {
  const router = useRouter(); const options = useApi<OrderOptions>("/api/order-form-options"); const [projectId, setProjectId] = useState(""); const [contactId, setContactId] = useState(""); const [note, setNote] = useState(""); const [rows, setRows] = useState<DraftLine[]>([{ key: 1, materialId: "", qty: "", unitPrice: "" }]); const [saving, setSaving] = useState(false);
  const linked = (options.data?.contacts ?? []).filter((contact) => (options.data?.projectContacts[Number(projectId)] ?? []).includes(contact.id));
  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.unitPrice || 0), 0), [rows]);
  function update(key: number, patch: Partial<DraftLine>) { setRows((old) => old.map((row) => row.key === key ? { ...row, ...patch, unitPrice: patch.materialId && !row.unitPrice ? String(options.data?.suggestedPrices[Number(patch.materialId)] ?? "") : patch.unitPrice ?? row.unitPrice } : row)); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { const result = await api<{ orderId: number }>("/api/orders", { method: "POST", ...jsonBody({ projectId: Number(projectId), supplierContactId: contactId ? Number(contactId) : null, note, items: rows.map((row) => ({ materialId: Number(row.materialId), qty: Number(row.qty), unitPrice: Number(row.unitPrice) })) }) }); toast.success("Đã tạo đơn vật tư."); router.push(`/orders/${result.orderId}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể tạo đơn."); } finally { setSaving(false); } }
  return <><PageTitle title="Tạo đơn vật tư" description="Chọn công trình và thêm các dòng vật tư cần đặt."/><DataState loading={options.loading} error={options.error} retry={options.refresh}><form onSubmit={submit} className="space-y-5"><Card><CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><NativeSelect label="Công trình" value={projectId} onChange={(value) => { setProjectId(value); setContactId(String(options.data?.projects.find((p) => p.id === Number(value))?.defaultSupplierContactId ?? "")); }} required options={[{ value: "", label: "Chọn công trình" }, ...(options.data?.projects ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))]}/><NativeSelect label="Đơn vị cung cấp" value={contactId} onChange={setContactId} options={[{ value: "", label: "Chưa chọn" }, ...linked.map((contact) => ({ value: String(contact.id), label: `${contact.name} · ${contact.phone}` }))]}/><div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium" htmlFor="order-note">Ghi chú</label><Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)}/></div></CardContent></Card><Card><CardHeader><CardTitle>Danh sách vật tư</CardTitle></CardHeader><CardContent className="space-y-4">{rows.map((row, index) => <div key={row.key} className="grid gap-3 border-b pb-4 sm:grid-cols-[minmax(200px,2fr)_1fr_1fr_auto]"><NativeSelect label={`Vật tư ${index + 1}`} value={row.materialId} onChange={(v) => update(row.key, { materialId: v })} required options={[{ value: "", label: "Chọn vật tư" }, ...(options.data?.materials ?? []).map((m) => ({ value: String(m.id), label: `${m.name} (${m.unit})` }))]}/><Field label="Số lượng" type="number" value={row.qty} onChange={(v) => update(row.key, { qty: v })} required/><Field label="Đơn giá" type="number" value={row.unitPrice} onChange={(v) => update(row.key, { unitPrice: v })} required/><div className="flex items-end"><Button className="w-full sm:w-auto" type="button" variant="outline" disabled={rows.length === 1} onClick={() => setRows((old) => old.filter((item) => item.key !== row.key))}>Xóa</Button></div><p className="text-sm text-muted-foreground sm:col-span-4">Thành tiền: {money(Number(row.qty || 0) * Number(row.unitPrice || 0))}</p></div>)}<Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setRows((old) => [...old, { key: Date.now(), materialId: "", qty: "", unitPrice: "" }])}>Thêm dòng</Button></CardContent></Card><div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between"><strong className="text-xl">Tổng cộng: {money(total)}</strong><Button className="w-full sm:w-auto" type="submit" disabled={saving}>{saving ? "Đang gửi…" : "Gửi đơn"}</Button></div></form></DataState></>;
}

export function Projects() {
  const query = useApi<Project[]>("/api/projects");
  return <><PageTitle title="Tổng hợp công trình" description="Tình trạng công trình và vật tư đã sử dụng."/><DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm mã, tên hoặc địa chỉ" searchText={(p) => `${p.code} ${p.name} ${p.address ?? ""}`} columns={[{ id: "code", label: "Mã", accessor: (p) => p.code, filter: { type: "text" }, render: (p) => p.code }, { id: "name", label: "Công trình", accessor: (p) => p.name, filter: { type: "text" }, render: (p) => <Link className="font-medium text-primary hover:underline" href={`/projects/${p.id}`}>{p.name}</Link> }, { id: "address", label: "Địa chỉ", accessor: (p) => p.address, filter: { type: "text" }, render: (p) => p.address }, { id: "status", label: "Trạng thái", accessor: (p) => p.status, filter: { type: "select", options: statusFilterOptions }, render: (p) => <Status value={p.status}/> }]}/></DataState></>;
}

type ProjectSummary = { project: Project; totalBudget: number; totalActual: number; totalDiff: number; suppliers: Contact[]; defaultSupplier: Contact | null; statusRows: { status: string; value: number }[]; recentOrders: OrderRow[]; neededMaterials: { materialId: number; name: string; unit: string; remainingQty: number; budgetQty: number; actualQty: number }[] };
export function ProjectDetail({ id }: { id: number }) {
  const query = useApi<ProjectSummary>(`/api/projects/${id}/summary`); const data = query.data;
  return <><PageTitle title={data?.project.name ?? "Công trình"} description={data ? `${data.project.code} · ${data.project.address ?? ""}` : undefined} action={<Button variant="outline" render={<Link href="/projects"/>}>Danh sách công trình</Button>}/><DataState loading={query.loading} error={query.error} retry={query.refresh}>{data && <><div className="grid gap-3 sm:grid-cols-3">{[{ title: "Dự toán", value: data.totalBudget }, { title: "Thực tế", value: data.totalActual }, { title: "Chênh lệch", value: data.totalDiff }].map((item) => <Card key={item.title}><CardContent className="py-5"><p className="text-sm text-muted-foreground">{item.title}</p><strong className="mt-1 block text-xl">{money(item.value)}</strong></CardContent></Card>)}</div><div className="mt-6 grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vật tư còn thiếu theo dự toán</CardTitle></CardHeader><CardContent><DataGrid rows={data.neededMaterials} columns={[{ id: "name", label: "Vật tư", accessor: (r) => r.name, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/material/${r.materialId}`}>{r.name}</Link> }, { id: "remainingQty", label: "Còn thiếu", accessor: (r) => r.remainingQty, filter: { type: "number" }, render: (r) => `${number(r.remainingQty)} ${r.unit}` }]}/></CardContent></Card><Card><CardHeader><CardTitle>Đơn vị cung cấp</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{data.suppliers.length ? data.suppliers.map((contact) => <div key={contact.id} className="flex justify-between border-b pb-2"><span>{contact.name}{data.defaultSupplier?.id === contact.id ? " · Mặc định" : ""}</span><span>{contact.phone}</span></div>) : <p className="text-muted-foreground">Chưa có đơn vị liên quan.</p>}</CardContent></Card></div><section className="mt-7"><h2 className="mb-3 text-lg font-semibold">Đơn gần đây</h2><OrderTable rows={data.recentOrders}/></section></>}</DataState></>;
}

type ReconcileRow = { materialId: number; name: string; unit: string; group: string; budgetQty: number; budgetAmount: number; actualQty: number; actualAmount: number };
type ReconcileData = { projects: Project[]; selectedId: number | null; rows: ReconcileRow[]; totalBudget: number; totalActual: number; totalDiff: number };
export function Reconcile() {
  const [project, setProject] = useState(""); const query = useApi<ReconcileData>(`/api/reconcile${project ? `?projectId=${project}` : ""}`); const data = query.data;
  return <><PageTitle title="Đối chiếu dự toán" description="So sánh số lượng và chi phí thực tế theo công trình."/><div className="mb-5 max-w-sm"><NativeSelect label="Công trình" value={project || String(data?.selectedId ?? "")} onChange={setProject} options={(data?.projects ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))}/></div><DataState loading={query.loading} error={query.error} retry={query.refresh}>{data && <><div className="mb-5 grid gap-3 sm:grid-cols-3">{[{ label: "Dự toán", value: data.totalBudget }, { label: "Thực tế", value: data.totalActual }, { label: "Chênh lệch", value: data.totalDiff }].map((item) => <Card key={item.label}><CardContent className="py-5"><p className="text-sm text-muted-foreground">{item.label}</p><strong className="text-xl">{money(item.value)}</strong></CardContent></Card>)}</div><DataGrid rows={data.rows} search="Tìm vật tư" searchText={(r) => `${r.name} ${r.group}`} columns={[{ id: "name", label: "Vật tư", accessor: (r) => r.name, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/material/${r.materialId}`}>{r.name}</Link> }, { id: "group", label: "Nhóm", accessor: (r) => r.group, filter: { type: "select" }, render: (r) => r.group }, { id: "budgetQty", label: "SL dự toán", accessor: (r) => r.budgetQty, filter: { type: "number" }, render: (r) => `${number(r.budgetQty)} ${r.unit}` }, { id: "actualQty", label: "SL thực tế", accessor: (r) => r.actualQty, filter: { type: "number" }, render: (r) => `${number(r.actualQty)} ${r.unit}` }, { id: "budgetAmount", label: "Tiền dự toán", accessor: (r) => r.budgetAmount, filter: { type: "number" }, render: (r) => money(r.budgetAmount) }, { id: "actualAmount", label: "Tiền thực tế", accessor: (r) => r.actualAmount, filter: { type: "number" }, render: (r) => money(r.actualAmount) }, { id: "difference", label: "Chênh lệch", accessor: (r) => r.actualAmount - r.budgetAmount, filter: { type: "number" }, render: (r) => money(r.actualAmount - r.budgetAmount) }]}/></>}</DataState></>;
}

type ReportData = { month: string; label: string; projects: Project[]; materialStats: { materialId: number; name: string; group: string; unit: string; qty: number; amount: number }[]; totalCost: number; groupData: { name: string; value: number }[] };
export function Reports() {
  const now = new Date(); const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`); const [project, setProject] = useState("all"); const path = `/api/reports?month=${month}${project !== "all" ? `&projectId=${project}` : ""}`; const query = useApi<ReportData>(path); const data = query.data;
  async function download() { try { const response = await fetch(`/api/reports/export?month=${month}${project !== "all" ? `&projectId=${project}` : ""}`); if (!response.ok) throw new Error("Không thể xuất CSV."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `thong-ke-${month}.csv`; a.click(); URL.revokeObjectURL(url); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xuất CSV."); } }
  return <><PageTitle title="Thống kê chi phí" description="Chi phí vật tư của các đơn đã xác nhận nhận hàng." action={<Button variant="outline" onClick={() => void download()}>Xuất CSV</Button>}/><div className="mb-5 grid max-w-xl gap-4 sm:grid-cols-2"><Field label="Tháng" type="month" value={month} onChange={setMonth}/><NativeSelect label="Công trình" value={project} onChange={setProject} options={[{ value: "all", label: "Tất cả công trình" }, ...(data?.projects ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))]}/></div><DataState loading={query.loading} error={query.error} retry={query.refresh}>{data && <><Card className="mb-5"><CardContent className="py-5"><p className="text-sm text-muted-foreground">Chi phí đã nhận tháng {data.label}</p><strong className="text-2xl">{money(data.totalCost)}</strong></CardContent></Card><div className="mb-5 grid gap-5 md:grid-cols-2"><Card><CardHeader><CardTitle>Theo nhóm vật tư</CardTitle></CardHeader><CardContent className="space-y-3">{data.groupData.length ? data.groupData.map((g) => <div key={g.name}><div className="flex justify-between gap-2 text-sm"><span>{g.name}</span><span>{money(g.value)}</span></div><div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${data.totalCost ? g.value / data.totalCost * 100 : 0}%` }}/></div></div>) : <p className="text-sm text-muted-foreground">Chưa có vật tư được xác nhận trong kỳ.</p>}</CardContent></Card></div><DataGrid rows={data.materialStats} search="Tìm vật tư" searchText={(r) => `${r.name} ${r.group}`} columns={[{ id: "name", label: "Vật tư", accessor: (r) => r.name, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/material/${r.materialId}`}>{r.name}</Link> }, { id: "group", label: "Nhóm", accessor: (r) => r.group, filter: { type: "select" }, render: (r) => r.group }, { id: "qty", label: "Số lượng", accessor: (r) => r.qty, filter: { type: "number" }, render: (r) => `${number(r.qty)} ${r.unit}` }, { id: "amount", label: "Chi phí", accessor: (r) => r.amount, filter: { type: "number" }, render: (r) => money(r.amount) }]}/></>}</DataState></>;
}

type Notification = { id: number; title: string; message: string; orderId: number | null; isRead: boolean; createdAt: string };
export function Notifications() {
  const query = useApi<Notification[]>("/api/notifications");
  async function mark(ids?: number[]) { try { await api("/api/notifications/read", { method: "PATCH", ...jsonBody(ids ? { ids } : {}) }); query.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không cập nhật được thông báo."); } }
  return <><PageTitle title="Thông báo" action={<Button variant="outline" onClick={() => void mark()}>Đánh dấu tất cả đã đọc</Button>}/><DataState loading={query.loading} error={query.error} retry={query.refresh}><div className="space-y-3">{query.data?.length ? query.data.map((item) => <Card key={item.id} className={item.isRead ? "" : "border-primary/40"}><CardContent className="flex flex-wrap items-start justify-between gap-3 py-4"><div><h2 className="font-medium"><Link className="hover:underline" href={`/details/notification/${item.id}`}>{item.title}</Link></h2><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{date(item.createdAt)}</p></div><div className="flex gap-2">{item.orderId && <Button size="sm" variant="outline" render={<Link href={`/orders/${item.orderId}`}/>}>Xem đơn</Button>}{!item.isRead && <Button size="sm" variant="ghost" onClick={() => void mark([item.id])}>Đã đọc</Button>}</div></CardContent></Card>) : <p className="text-sm text-muted-foreground">Chưa có thông báo.</p>}</div></DataState></>;
}

type ActivityRow = { id: number; summary: string; actorName: string; action: string; createdAt: string };
export function Activity() {
  const query = useApi<ActivityRow[]>("/api/activity");
  return <><PageTitle title="Nhật ký hoạt động" description="Các thay đổi và thao tác gần đây trong hệ thống."/><DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm hoạt động" searchText={(r) => `${r.summary} ${r.actorName}`} columns={[{ id: "createdAt", label: "Thời gian", accessor: (r) => r.createdAt, filter: { type: "date" }, render: (r) => date(r.createdAt) }, { id: "actor", label: "Người thực hiện", accessor: (r) => r.actorName, filter: { type: "select" }, render: (r) => r.actorName }, { id: "summary", label: "Nội dung", accessor: (r) => r.summary, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/activity/${r.id}`}>{r.summary}</Link> }]}/></DataState></>;
}

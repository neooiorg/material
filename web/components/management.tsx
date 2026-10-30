"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import { date, money, number } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton, DataGrid, DataState, Field, NativeSelect, PageTitle, Status, useApi } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";

type CatalogKind = "projects" | "materials" | "supplier-contacts";
type CatalogRow = { id: number; code?: string; name: string; address?: string | null; status?: string; unit?: string; group?: string; phone?: string; defaultSupplierContactId?: number | null };
type Contact = { id: number; name: string; phone: string };
const title: Record<CatalogKind, string> = { projects: "Quản lý công trình", materials: "Quản lý vật tư", "supplier-contacts": "Đơn vị cung cấp" };
const blank = { code: "", name: "", address: "", status: "active", unit: "", group: "", phone: "", defaultSupplierContactId: "", supplierContactIds: [] as number[] };

export function AdminCatalog({ kind }: { kind: CatalogKind }) {
  const query = useApi<CatalogRow[]>(`/api/${kind}`);
  const contacts = useApi<Contact[]>(kind === "projects" ? "/api/supplier-contacts" : null);
  const [draft, setDraft] = useState({ ...blank });
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  function set(key: keyof typeof blank, value: string | number[]) { setDraft((old) => ({ ...old, [key]: value })); }
  function reset() { setDraft({ ...blank }); setEditing(null); setOpen(false); }
  async function edit(row: CatalogRow) {
    let supplierContactIds: number[] = [];
    if (kind === "projects") {
      try { const detail = await api<{ suppliers: Contact[] }>(`/api/projects/${row.id}/summary`); supplierContactIds = detail.suppliers.map((item) => item.id); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không tải được liên hệ công trình."); return; }
    }
    setDraft({ code: row.code ?? "", name: row.name, address: row.address ?? "", status: row.status ?? "active", unit: row.unit ?? "", group: row.group ?? "", phone: row.phone ?? "", defaultSupplierContactId: row.defaultSupplierContactId ? String(row.defaultSupplierContactId) : "", supplierContactIds });
    setEditing(row.id); setOpen(true);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const body = kind === "projects" ? { code: draft.code, name: draft.name, address: draft.address, status: draft.status, defaultSupplierContactId: draft.defaultSupplierContactId ? Number(draft.defaultSupplierContactId) : null, supplierContactIds: draft.supplierContactIds }
        : kind === "materials" ? { code: draft.code, name: draft.name, unit: draft.unit, group: draft.group } : { name: draft.name, phone: draft.phone };
      await api(`/api/${kind}${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", ...jsonBody(body) });
      toast.success(editing ? "Đã lưu thay đổi." : "Đã thêm dữ liệu."); reset(); query.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể lưu."); }
    finally { setSaving(false); }
  }
  async function remove(row: CatalogRow) {
    try { await api(`/api/${kind}/${row.id}`, { method: "DELETE" }); toast.success("Đã xóa."); query.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể xóa."); }
  }
  const addAction = kind === "projects" ? <Button render={<Link href="/admin/projects/new"/>}>Thêm công trình</Button> : <Button onClick={() => { reset(); setOpen(true); }}>Thêm mới</Button>;
  return <><PageTitle title={title[kind]} description="Danh mục dữ liệu dùng chung trong toàn hệ thống." action={addAction}/>
    <Dialog open={open && kind !== "projects"} onOpenChange={(next) => { if (!next) reset(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Cập nhật" : "Thêm mới"} {kind === "materials" ? "vật tư" : "đơn vị cung cấp"}</DialogTitle><DialogDescription>Nhập thông tin bên dưới rồi lưu thay đổi.</DialogDescription></DialogHeader>
        <form id="catalog-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {kind === "materials" && <Field label="Mã" value={draft.code} onChange={(v) => set("code", v)} required/>}
          <Field label={kind === "supplier-contacts" ? "Tên đơn vị" : "Tên"} value={draft.name} onChange={(v) => set("name", v)} required/>
          {kind === "materials" && <><Field label="Đơn vị tính" value={draft.unit} onChange={(v) => set("unit", v)} required/><Field label="Nhóm" value={draft.group} onChange={(v) => set("group", v)}/></>}
          {kind === "supplier-contacts" && <Field label="Số Zalo" value={draft.phone} onChange={(v) => set("phone", v)} required/>}
        </form>
        <DialogFooter><DialogClose render={<Button variant="outline"/>}>Hủy</DialogClose><Button type="submit" form="catalog-form" disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm kiếm" searchText={(r) => `${r.code ?? ""} ${r.name} ${r.address ?? ""} ${r.group ?? ""} ${r.phone ?? ""}`} columns={[
      ...(kind !== "supplier-contacts" ? [{ id: "code", label: "Mã", accessor: (r: CatalogRow) => r.code, filter: { type: "text" as const }, render: (r: CatalogRow) => r.code }] : []),
      { id: "name", label: "Tên", accessor: (r: CatalogRow) => r.name, filter: { type: "text" }, render: (r: CatalogRow) => <Link className="font-medium text-primary hover:underline" href={kind === "projects" ? `/projects/${r.id}` : `/details/${kind === "materials" ? "material" : "supplier-contact"}/${r.id}`}>{r.name}</Link> },
      { id: "detail", label: kind === "projects" ? "Địa chỉ" : kind === "materials" ? "Nhóm / đơn vị" : "Số Zalo", accessor: (r: CatalogRow) => kind === "projects" ? r.address : kind === "materials" ? r.group : r.phone, filter: { type: kind === "materials" ? "select" : "text" }, render: (r: CatalogRow) => kind === "projects" ? r.address : kind === "materials" ? `${r.group} · ${r.unit}` : r.phone },
      ...(kind === "projects" ? [{ id: "status", label: "Trạng thái", accessor: (r: CatalogRow) => r.status, filter: { type: "select" as const, options: [{ value: "active", label: "Đang thực hiện" }, { value: "completed", label: "Hoàn thành" }, { value: "paused", label: "Tạm dừng" }] }, render: (r: CatalogRow) => <Status value={r.status ?? ""}/> }] : []),
      { id: "actions", label: "Thao tác", sortable: false, hideable: false, exportable: false, render: (r: CatalogRow) => <div className="flex flex-wrap gap-2">{kind === "projects" ? <Button size="sm" variant="outline" render={<Link href={`/admin/projects/${r.id}/edit`}/>}>Sửa</Button> : <Button size="sm" variant="outline" onClick={() => void edit(r)}>Sửa</Button>}<ConfirmButton title={`Xóa ${r.name}?`} description="Dữ liệu sẽ bị xóa khỏi hệ thống và không thể khôi phục." onConfirm={() => remove(r)}/></div> },
    ]}/></DataState></>;
}

type ProjectFormData = { project: CatalogRow; suppliers: Contact[] };
export function ProjectForm({ id }: { id?: number }) {
  const router = useRouter();
  const contacts = useApi<Contact[]>("/api/supplier-contacts");
  const detail = useApi<ProjectFormData>(id ? `/api/projects/${id}/summary` : null);
  const [draft, setDraft] = useState({ ...blank });
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !detail.data || loadedId === id) return;
    const project = detail.data.project;
    setDraft({ ...blank, code: project.code ?? "", name: project.name, address: project.address ?? "", status: project.status ?? "active", defaultSupplierContactId: project.defaultSupplierContactId ? String(project.defaultSupplierContactId) : "", supplierContactIds: detail.data.suppliers.map((supplier) => supplier.id) });
    setLoadedId(id);
  }, [detail.data, id, loadedId]);

  function set(key: keyof typeof blank, value: string | number[]) { setDraft((current) => ({ ...current, [key]: value })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      await api(`/api/projects${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", ...jsonBody({ code: draft.code, name: draft.name, address: draft.address, status: draft.status, defaultSupplierContactId: draft.defaultSupplierContactId ? Number(draft.defaultSupplierContactId) : null, supplierContactIds: draft.supplierContactIds }) });
      toast.success(id ? "Đã cập nhật công trình." : "Đã thêm công trình.");
      router.push("/admin/projects");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể lưu công trình."); }
    finally { setSaving(false); }
  }

  const loading = contacts.loading || Boolean(id && detail.loading);
  return <>
    <PageTitle title={id ? "Cập nhật công trình" : "Thêm công trình"} description="Thông tin, trạng thái và các đơn vị cung cấp liên quan." action={<Button variant="outline" render={<Link href="/admin/projects"/>}>Quay lại danh sách</Button>}/>
    <DataState loading={loading} error={contacts.error || detail.error} retry={() => { contacts.refresh(); detail.refresh(); }} loadingVariant="form">
      <form onSubmit={save} className="space-y-6">
        <Card><CardHeader><CardTitle>Thông tin công trình</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã công trình" value={draft.code} onChange={(value) => set("code", value)} required/>
          <Field label="Tên công trình" value={draft.name} onChange={(value) => set("name", value)} required/>
          <div className="sm:col-span-2"><Field label="Địa chỉ" value={draft.address} onChange={(value) => set("address", value)}/></div>
          <NativeSelect label="Trạng thái" value={draft.status} onChange={(value) => set("status", value)} options={[{ value: "active", label: "Đang thực hiện" }, { value: "completed", label: "Hoàn thành" }, { value: "paused", label: "Tạm dừng" }]}/>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Đơn vị cung cấp</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><SearchableMultiSelect label="Đơn vị liên quan" values={draft.supplierContactIds.map(String)} onChange={(values) => set("supplierContactIds", values.map(Number))} options={(contacts.data ?? []).map((contact) => ({ value: String(contact.id), label: `${contact.name} · ${contact.phone}` }))}/></div>
          <NativeSelect label="Đơn vị mặc định" value={draft.defaultSupplierContactId} onChange={(value) => set("defaultSupplierContactId", value)} options={[{ value: "", label: "Không chọn" }, ...(contacts.data ?? []).filter((contact) => draft.supplierContactIds.includes(contact.id)).map((contact) => ({ value: String(contact.id), label: contact.name }))]} searchable/>
        </CardContent></Card>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => router.push("/admin/projects")}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : id ? "Lưu thay đổi" : "Thêm công trình"}</Button></div>
      </form>
    </DataState>
  </>;
}

type Project = { id: number; code: string; name: string };
type Material = { id: number; name: string; unit: string; group: string };
type Budget = { id: number; materialId: number; name: string; unit: string; group: string; qty: string; unitPrice: string };
export function Budgets() {
  const projects = useApi<Project[]>("/api/projects"); const materials = useApi<Material[]>("/api/materials");
  const [projectId, setProjectId] = useState(""); const [materialId, setMaterialId] = useState(""); const [qty, setQty] = useState(""); const [unitPrice, setUnitPrice] = useState(""); const [saving, setSaving] = useState(false); const [open, setOpen] = useState(false); const [editingBudget, setEditingBudget] = useState(false);
  const rows = useApi<Budget[]>(projectId ? `/api/budgets?projectId=${projectId}` : null);
  function reset() { setMaterialId(""); setQty(""); setUnitPrice(""); setEditingBudget(false); setOpen(false); }
  function edit(row: Budget) { setMaterialId(String(row.materialId)); setQty(row.qty); setUnitPrice(row.unitPrice); setEditingBudget(true); setOpen(true); }
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await api("/api/budgets", { method: "PUT", ...jsonBody({ projectId: Number(projectId), materialId: Number(materialId), qty: Number(qty), unitPrice: Number(unitPrice) }) }); toast.success("Đã cập nhật dự toán."); reset(); rows.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể lưu."); } finally { setSaving(false); } }
  async function remove(id: number) { try { await api(`/api/budgets/${id}`, { method: "DELETE" }); rows.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xóa."); } }
  return <><PageTitle title="Dự toán công trình" description="Thiết lập số lượng và đơn giá theo từng công trình." action={projectId ? <Button onClick={() => { reset(); setOpen(true); }}>Thêm dòng dự toán</Button> : undefined}/><Card size="sm" className="mb-6 max-w-md"><CardContent><NativeSelect label="Công trình" value={projectId} onChange={(value) => { setProjectId(value); reset(); }} options={[{ value: "", label: "Chọn công trình" }, ...(projects.data ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))]} searchable/></CardContent></Card>
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); else setOpen(true); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingBudget ? "Cập nhật dòng dự toán" : "Thêm dòng dự toán"}</DialogTitle><DialogDescription>Chọn vật tư, số lượng và đơn giá dự kiến.</DialogDescription></DialogHeader><form id="budget-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><NativeSelect label="Vật tư" value={materialId} onChange={setMaterialId} required searchable options={[{ value: "", label: "Chọn vật tư" }, ...(materials.data ?? []).map((m) => ({ value: String(m.id), label: `${m.name} (${m.unit})` }))]}/></div><Field label="Số lượng" type="number" value={qty} onChange={setQty} required/><Field label="Đơn giá" type="number" value={unitPrice} onChange={setUnitPrice} required/></form><DialogFooter><DialogClose render={<Button variant="outline"/>}>Hủy</DialogClose><Button type="submit" form="budget-form" disabled={saving}>{saving ? "Đang lưu…" : "Lưu dự toán"}</Button></DialogFooter></DialogContent></Dialog>
    {projectId && <DataState loading={rows.loading} error={rows.error} retry={rows.refresh}><DataGrid rows={rows.data ?? []} search="Tìm vật tư" searchText={(r) => `${r.name} ${r.group}`} columns={[{ id: "name", label: "Vật tư", accessor: (r) => r.name, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/budget/${r.id}?projectId=${projectId}`}>{r.name}</Link> }, { id: "group", label: "Nhóm", accessor: (r) => r.group, filter: { type: "select" }, render: (r) => r.group }, { id: "qty", label: "Số lượng", accessor: (r) => Number(r.qty), filter: { type: "number" }, render: (r) => `${number(r.qty)} ${r.unit}` }, { id: "unitPrice", label: "Đơn giá", accessor: (r) => Number(r.unitPrice), filter: { type: "number" }, render: (r) => money(r.unitPrice) }, { id: "amount", label: "Thành tiền", accessor: (r) => Number(r.qty) * Number(r.unitPrice), filter: { type: "number" }, render: (r) => money(Number(r.qty) * Number(r.unitPrice)) }, { id: "actions", label: "Thao tác", sortable: false, hideable: false, exportable: false, render: (r) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => edit(r)}>Sửa</Button><ConfirmButton title={`Xóa dự toán ${r.name}?`} description="Dòng dự toán này sẽ bị xóa và không thể khôi phục." onConfirm={() => remove(r.id)}/></div> }]}/></DataState>}
  </>;
}

type Member = { id: string; name: string; email: string; role: string; createdAt: string };
type AccessRequest = { id: string; userId: string; name: string; email: string; requestedRole: string; note: string | null; createdAt: string };

function AccessRequestsPanel({ onApproved }: { onApproved: () => void }) {
  const query = useApi<AccessRequest[]>("/api/access-requests");
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState("");

  async function approve(request: AccessRequest) {
    setProcessing(request.id);
    try {
      const role = roles[request.id] ?? (request.requestedRole === "accountant" ? "accountant" : "site");
      await api(`/api/access-requests/${request.id}/approve`, { method: "POST", ...jsonBody({ role }) });
      toast.success(`Đã cấp quyền cho ${request.name}.`);
      query.refresh();
      onApproved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể cấp quyền."); }
    finally { setProcessing(""); }
  }

  async function reject(request: AccessRequest) {
    setProcessing(request.id);
    try {
      await api(`/api/access-requests/${request.id}/reject`, { method: "POST" });
      toast.success(`Đã từ chối yêu cầu của ${request.name}.`);
      query.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể từ chối yêu cầu."); }
    finally { setProcessing(""); }
  }

  return <Card className="mb-6">
    <CardHeader>
      <CardTitle>Yêu cầu phân quyền</CardTitle>
      <p className="text-sm text-muted-foreground">Tài khoản mới đăng nhập đang chờ Admin xác nhận vai trò.</p>
    </CardHeader>
    <CardContent>
      <DataState loading={query.loading} error={query.error} retry={query.refresh}>
        {(query.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Không có yêu cầu nào đang chờ.</p> : <DataGrid
          rows={query.data ?? []}
          search="Tìm tên hoặc email"
          searchText={(request) => `${request.name} ${request.email} ${request.note ?? ""}`}
          columns={[
            { id: "name", label: "Tài khoản", accessor: (request) => request.name, filter: { type: "text" }, render: (request) => <div><p className="font-medium">{request.name}</p><p className="text-xs text-muted-foreground">{request.email}</p></div> },
            { id: "requestedRole", label: "Đề xuất", accessor: (request) => request.requestedRole, filter: { type: "select", options: [{ value: "site", label: "Thi công" }, { value: "accountant", label: "Kế toán" }] }, render: (request) => request.requestedRole === "accountant" ? "Kế toán" : "Bộ phận thi công" },
            { id: "note", label: "Ghi chú", accessor: (request) => request.note ?? "", filter: { type: "text" }, render: (request) => request.note || "—" },
            { id: "createdAt", label: "Gửi lúc", accessor: (request) => request.createdAt, filter: { type: "date" }, render: (request) => date(request.createdAt) },
            { id: "actions", label: "Cấp quyền", sortable: false, hideable: false, exportable: false, render: (request) => <div className="flex max-w-full flex-wrap items-center gap-2">
              <Select value={roles[request.id] ?? (request.requestedRole === "accountant" ? "accountant" : "site")} onValueChange={(value) => setRoles((current) => ({ ...current, [request.id]: value ?? "site" }))}>
                <SelectTrigger className="w-40" aria-label={`Vai trò cấp cho ${request.name}`}><SelectValue>{({ site: "Thi công", accountant: "Kế toán", admin: "Quản trị" } as Record<string, string>)[roles[request.id] ?? (request.requestedRole === "accountant" ? "accountant" : "site")]}</SelectValue></SelectTrigger>
                <SelectContent><SelectItem value="site">Thi công</SelectItem><SelectItem value="accountant">Kế toán</SelectItem><SelectItem value="admin">Quản trị</SelectItem></SelectContent>
              </Select>
              <Button size="sm" disabled={processing === request.id} onClick={() => void approve(request)}>Duyệt</Button>
              <Button size="sm" variant="outline" disabled={processing === request.id} onClick={() => void reject(request)}>Từ chối</Button>
            </div> },
          ]}
        />}
      </DataState>
    </CardContent>
  </Card>;
}

export function Members() {
  const query = useApi<Member[]>("/api/members"); const [editing, setEditing] = useState<string | null>(null); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("site"); const [saving, setSaving] = useState(false); const [invitation, setInvitation] = useState(""); const [open, setOpen] = useState(false);
  function edit(m: Member) { setEditing(m.id); setName(m.name); setEmail(m.email); setRole(m.role); setInvitation(""); setOpen(true); }
  function reset() { setEditing(null); setName(""); setEmail(""); setRole("site"); setOpen(false); }
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { const result = await api<{ temporaryPassword?: string; emailSent?: boolean; emailWarning?: string }>(editing ? `/api/members/${editing}` : "/api/members/invite", { method: editing ? "PATCH" : "POST", ...jsonBody({ name, email, role }) }); if (!editing && !result.emailSent && result.temporaryPassword) setInvitation(`Email chưa gửi được. Mật khẩu tạm của ${email}: ${result.temporaryPassword}. Hãy lưu và gửi riêng cho thành viên.`); else setInvitation(""); toast.success(editing ? "Đã cập nhật thành viên." : "Đã mời thành viên."); reset(); query.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể lưu."); } finally { setSaving(false); } }
  async function remove(m: Member) { try { await api(`/api/members/${m.id}`, { method: "DELETE" }); query.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xóa."); } }
  return <><PageTitle title="Thành viên" description="Duyệt tài khoản mới, mời và phân quyền nhân sự nội bộ." action={<Button onClick={() => { reset(); setOpen(true); }}>Mời thành viên</Button>}/><AccessRequestsPanel onApproved={query.refresh}/><Dialog open={open} onOpenChange={(next) => { if (!next) reset(); else setOpen(true); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? "Cập nhật thành viên" : "Mời thành viên"}</DialogTitle><DialogDescription>{editing ? "Chỉnh sửa thông tin và vai trò của thành viên." : "Tạo tài khoản và gửi thông tin đăng nhập cho nhân sự mới."}</DialogDescription></DialogHeader><form id="member-form" onSubmit={save} className="grid gap-4"><Field label="Họ tên" value={name} onChange={setName} required/><Field label="Email" type="email" value={email} onChange={setEmail} required/><NativeSelect label="Vai trò" value={role} onChange={setRole} options={[{ value: "site", label: "Bộ phận thi công" }, { value: "accountant", label: "Kế toán" }, { value: "admin", label: "Quản trị" }]}/></form><DialogFooter><DialogClose render={<Button variant="outline"/>}>Hủy</DialogClose><Button type="submit" form="member-form" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Gửi lời mời"}</Button></DialogFooter></DialogContent></Dialog>{invitation && <p role="status" className="mb-4 rounded-xl bg-muted p-4 text-sm text-foreground ring-1 ring-foreground/10">{invitation}</p>}<DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm thành viên" searchText={(m) => `${m.name} ${m.email} ${m.role}`} columns={[{ id: "name", label: "Họ tên", accessor: (m) => m.name, filter: { type: "text" }, render: (m) => m.name }, { id: "email", label: "Email", accessor: (m) => m.email, filter: { type: "text" }, render: (m) => m.email }, { id: "role", label: "Vai trò", accessor: (m) => m.role, filter: { type: "select", options: [{ value: "site", label: "Thi công" }, { value: "accountant", label: "Kế toán" }, { value: "admin", label: "Quản trị" }] }, render: (m) => m.role === "site" ? "Thi công" : m.role === "admin" ? "Quản trị" : "Kế toán" }, { id: "actions", label: "Thao tác", sortable: false, hideable: false, exportable: false, render: (m) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => edit(m)}>Sửa</Button><ConfirmButton title={`Xóa thành viên ${m.name}?`} description="Tài khoản và toàn bộ phiên đăng nhập của thành viên sẽ bị xóa." onConfirm={() => remove(m)}/></div> }]}/></DataState></>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import { money, number } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton, DataGrid, DataState, Field, NativeSelect, PageTitle, Status, useApi } from "@/components/common";
import { Checkbox } from "@/components/ui/checkbox";

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
  return <><PageTitle title={title[kind]} description="Dữ liệu dùng chung với ứng dụng mobile." action={<Button onClick={() => { reset(); setOpen(true); }}>Thêm mới</Button>}/>
    {open && <Card className="mb-6"><CardHeader><CardTitle>{editing ? "Cập nhật" : "Thêm mới"}</CardTitle></CardHeader><CardContent><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {kind !== "supplier-contacts" && <Field label="Mã" value={draft.code} onChange={(v) => set("code", v)} required/>}
      <Field label={kind === "supplier-contacts" ? "Tên đơn vị" : "Tên"} value={draft.name} onChange={(v) => set("name", v)} required/>
      {kind === "projects" && <><Field label="Địa chỉ" value={draft.address} onChange={(v) => set("address", v)}/><NativeSelect label="Trạng thái" value={draft.status} onChange={(v) => set("status", v)} options={[{ value: "active", label: "Đang thực hiện" }, { value: "completed", label: "Hoàn thành" }, { value: "paused", label: "Tạm dừng" }]}/><div className="space-y-2 sm:col-span-2"><p className="text-sm font-medium">Đơn vị cung cấp liên quan</p><div className="flex flex-wrap gap-3">{contacts.data?.map((contact) => <label key={contact.id} className="flex min-h-8 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={draft.supplierContactIds.includes(contact.id)} onCheckedChange={(checked) => set("supplierContactIds", checked ? [...draft.supplierContactIds, contact.id] : draft.supplierContactIds.filter((id) => id !== contact.id))}/>{contact.name}</label>)}</div></div><NativeSelect label="Đơn vị mặc định" value={draft.defaultSupplierContactId} onChange={(v) => set("defaultSupplierContactId", v)} options={[{ value: "", label: "Không chọn" }, ...(contacts.data ?? []).filter((item) => draft.supplierContactIds.includes(item.id)).map((item) => ({ value: String(item.id), label: item.name }))]}/></>}
      {kind === "materials" && <><Field label="Đơn vị tính" value={draft.unit} onChange={(v) => set("unit", v)} required/><Field label="Nhóm" value={draft.group} onChange={(v) => set("group", v)}/></>}
      {kind === "supplier-contacts" && <Field label="Số Zalo" value={draft.phone} onChange={(v) => set("phone", v)} required/>}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button><Button type="button" variant="outline" onClick={reset}>Hủy</Button></div>
    </form></CardContent></Card>}
    <DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm kiếm" searchText={(r) => `${r.code ?? ""} ${r.name} ${r.address ?? ""} ${r.group ?? ""} ${r.phone ?? ""}`} columns={[
      ...(kind !== "supplier-contacts" ? [{ id: "code", label: "Mã", accessor: (r: CatalogRow) => r.code, filter: { type: "text" as const }, render: (r: CatalogRow) => r.code }] : []),
      { id: "name", label: "Tên", accessor: (r: CatalogRow) => r.name, filter: { type: "text" }, render: (r: CatalogRow) => <Link className="font-medium text-primary hover:underline" href={kind === "projects" ? `/projects/${r.id}` : `/details/${kind === "materials" ? "material" : "supplier-contact"}/${r.id}`}>{r.name}</Link> },
      { id: "detail", label: kind === "projects" ? "Địa chỉ" : kind === "materials" ? "Nhóm / đơn vị" : "Số Zalo", accessor: (r: CatalogRow) => kind === "projects" ? r.address : kind === "materials" ? r.group : r.phone, filter: { type: kind === "materials" ? "select" : "text" }, render: (r: CatalogRow) => kind === "projects" ? r.address : kind === "materials" ? `${r.group} · ${r.unit}` : r.phone },
      ...(kind === "projects" ? [{ id: "status", label: "Trạng thái", accessor: (r: CatalogRow) => r.status, filter: { type: "select" as const, options: [{ value: "active", label: "Đang thực hiện" }, { value: "completed", label: "Hoàn thành" }, { value: "paused", label: "Tạm dừng" }] }, render: (r: CatalogRow) => <Status value={r.status ?? ""}/> }] : []),
      { id: "actions", label: "Thao tác", sortable: false, hideable: false, exportable: false, render: (r: CatalogRow) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void edit(r)}>Sửa</Button><ConfirmButton title={`Xóa ${r.name}?`} description="Dữ liệu sẽ bị xóa khỏi hệ thống và không thể khôi phục." onConfirm={() => remove(r)}/></div> },
    ]}/></DataState></>;
}

type Project = { id: number; code: string; name: string };
type Material = { id: number; name: string; unit: string; group: string };
type Budget = { id: number; materialId: number; name: string; unit: string; group: string; qty: string; unitPrice: string };
export function Budgets() {
  const projects = useApi<Project[]>("/api/projects"); const materials = useApi<Material[]>("/api/materials");
  const [projectId, setProjectId] = useState(""); const [materialId, setMaterialId] = useState(""); const [qty, setQty] = useState(""); const [unitPrice, setUnitPrice] = useState(""); const [saving, setSaving] = useState(false);
  const rows = useApi<Budget[]>(projectId ? `/api/budgets?projectId=${projectId}` : null);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await api("/api/budgets", { method: "PUT", ...jsonBody({ projectId: Number(projectId), materialId: Number(materialId), qty: Number(qty), unitPrice: Number(unitPrice) }) }); toast.success("Đã cập nhật dự toán."); setMaterialId(""); setQty(""); setUnitPrice(""); rows.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể lưu."); } finally { setSaving(false); } }
  async function remove(id: number) { try { await api(`/api/budgets/${id}`, { method: "DELETE" }); rows.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xóa."); } }
  return <><PageTitle title="Dự toán công trình" description="Thiết lập số lượng và đơn giá theo từng công trình."/><div className="mb-6 max-w-sm"><NativeSelect label="Công trình" value={projectId} onChange={setProjectId} options={[{ value: "", label: "Chọn công trình" }, ...(projects.data ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))]}/></div>{projectId && <><Card className="mb-6"><CardHeader><CardTitle>Thêm hoặc cập nhật dòng dự toán</CardTitle></CardHeader><CardContent><form onSubmit={save} className="grid gap-4 sm:grid-cols-4"><NativeSelect label="Vật tư" value={materialId} onChange={setMaterialId} required options={[{ value: "", label: "Chọn vật tư" }, ...(materials.data ?? []).map((m) => ({ value: String(m.id), label: `${m.name} (${m.unit})` }))]}/><Field label="Số lượng" type="number" value={qty} onChange={setQty} required/><Field label="Đơn giá" type="number" value={unitPrice} onChange={setUnitPrice} required/><div className="flex items-end"><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu dự toán"}</Button></div></form></CardContent></Card><DataState loading={rows.loading} error={rows.error} retry={rows.refresh}><DataGrid rows={rows.data ?? []} search="Tìm vật tư" searchText={(r) => `${r.name} ${r.group}`} columns={[{ id: "name", label: "Vật tư", accessor: (r) => r.name, filter: { type: "text" }, render: (r) => <Link className="font-medium text-primary hover:underline" href={`/details/budget/${r.id}?projectId=${projectId}`}>{r.name}</Link> }, { id: "group", label: "Nhóm", accessor: (r) => r.group, filter: { type: "select" }, render: (r) => r.group }, { id: "qty", label: "Số lượng", accessor: (r) => Number(r.qty), filter: { type: "number" }, render: (r) => `${number(r.qty)} ${r.unit}` }, { id: "unitPrice", label: "Đơn giá", accessor: (r) => Number(r.unitPrice), filter: { type: "number" }, render: (r) => money(r.unitPrice) }, { id: "amount", label: "Thành tiền", accessor: (r) => Number(r.qty) * Number(r.unitPrice), filter: { type: "number" }, render: (r) => money(Number(r.qty) * Number(r.unitPrice)) }, { id: "actions", label: "", sortable: false, hideable: false, exportable: false, render: (r) => <ConfirmButton title={`Xóa dự toán ${r.name}?`} description="Dòng dự toán này sẽ bị xóa và không thể khôi phục." onConfirm={() => remove(r.id)}/> }]}/></DataState></>}</>;
}

type Member = { id: string; name: string; email: string; role: string; createdAt: string };
export function Members() {
  const query = useApi<Member[]>("/api/members"); const [editing, setEditing] = useState<string | null>(null); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("site"); const [saving, setSaving] = useState(false); const [invitation, setInvitation] = useState("");
  function edit(m: Member) { setEditing(m.id); setName(m.name); setEmail(m.email); setRole(m.role); setInvitation(""); }
  function reset() { setEditing(null); setName(""); setEmail(""); setRole("site"); }
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { const result = await api<{ temporaryPassword?: string; emailSent?: boolean; emailWarning?: string }>(editing ? `/api/members/${editing}` : "/api/members/invite", { method: editing ? "PATCH" : "POST", ...jsonBody({ name, email, role }) }); if (!editing && !result.emailSent && result.temporaryPassword) setInvitation(`Email chưa gửi được. Mật khẩu tạm của ${email}: ${result.temporaryPassword}. Hãy lưu và gửi riêng cho thành viên.`); else setInvitation(""); toast.success(editing ? "Đã cập nhật thành viên." : "Đã mời thành viên."); reset(); query.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể lưu."); } finally { setSaving(false); } }
  async function remove(m: Member) { try { await api(`/api/members/${m.id}`, { method: "DELETE" }); query.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xóa."); } }
  return <><PageTitle title="Thành viên" description="Mời và phân quyền nhân sự nội bộ."/><Card className="mb-6"><CardHeader><CardTitle>{editing ? "Cập nhật thành viên" : "Mời thành viên"}</CardTitle></CardHeader><CardContent><form onSubmit={save} className="grid gap-4 sm:grid-cols-4"><Field label="Họ tên" value={name} onChange={setName} required/><Field label="Email" type="email" value={email} onChange={setEmail} required/><NativeSelect label="Vai trò" value={role} onChange={setRole} options={[{ value: "site", label: "Bộ phận thi công" }, { value: "accountant", label: "Kế toán" }, { value: "admin", label: "Quản trị" }]}/><div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu" : "Gửi lời mời"}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Hủy</Button>}</div></form></CardContent></Card>{invitation && <p role="status" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{invitation}</p>}<DataState loading={query.loading} error={query.error} retry={query.refresh}><DataGrid rows={query.data ?? []} search="Tìm thành viên" searchText={(m) => `${m.name} ${m.email} ${m.role}`} columns={[{ id: "name", label: "Họ tên", accessor: (m) => m.name, filter: { type: "text" }, render: (m) => m.name }, { id: "email", label: "Email", accessor: (m) => m.email, filter: { type: "text" }, render: (m) => m.email }, { id: "role", label: "Vai trò", accessor: (m) => m.role, filter: { type: "select", options: [{ value: "site", label: "Thi công" }, { value: "accountant", label: "Kế toán" }, { value: "admin", label: "Quản trị" }] }, render: (m) => m.role === "site" ? "Thi công" : m.role === "admin" ? "Quản trị" : "Kế toán" }, { id: "actions", label: "Thao tác", sortable: false, hideable: false, exportable: false, render: (m) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(m)}>Sửa</Button><ConfirmButton title={`Xóa thành viên ${m.name}?`} description="Tài khoản và toàn bộ phiên đăng nhập của thành viên sẽ bị xóa." onConfirm={() => remove(m)}/></div> }]}/></DataState></>;
}

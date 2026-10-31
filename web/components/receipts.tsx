"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Camera, CheckCircle2, ExternalLink, FileText, ImageIcon, PackageCheck, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton, DataGrid, DataState, PageTitle, useApi } from "@/components/common";

type ReceiptRow = {
  id: number;
  code: string;
  projectName: string;
  creatorName: string;
  approvedAt: string | null;
  total: string;
  proofCount: number;
  receiptCount: number;
  receivedAmount: string;
};

export type OrderProof = {
  id: number;
  receiptId: number | null;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string | null;
};

export type ReceiptEvent = {
  id: number;
  sequence: number;
  receivedAt: string;
  receivedByName: string | null;
  note: string | null;
  isFinal: boolean;
  items: { orderItemId: number; name: string; unit: string; qty: string; amount: string }[];
};

type ReceiptOrderItem = { id: number; name: string; unit: string; qty: string; unitPrice: string };

export function Receipts() {
  const query = useApi<ReceiptRow[]>("/api/receipts");
  return <>
    <PageTitle title="Xác nhận nhận hàng" description="Các đơn đã duyệt đang chờ kỹ thuật chụp ảnh hoặc đính kèm phiếu xác thực." />
    <DataState loading={query.loading} error={query.error} retry={query.refresh}>
      <DataGrid
        rows={query.data ?? []}
        search="Tìm mã đơn, công trình, người tạo"
        searchText={(row) => `${row.code} ${row.projectName} ${row.creatorName}`}
        columns={[
          { id: "code", label: "Mã đơn", accessor: (row) => row.code, filter: { type: "text" }, render: (row) => <Link className="font-medium text-primary hover:underline" href={`/orders/${row.id}`}>{row.code}</Link> },
          { id: "project", label: "Công trình", accessor: (row) => row.projectName, filter: { type: "select" }, render: (row) => row.projectName },
          { id: "creator", label: "Người tạo", accessor: (row) => row.creatorName, filter: { type: "select" }, render: (row) => row.creatorName },
          { id: "approvedAt", label: "Ngày duyệt", accessor: (row) => row.approvedAt ?? "", filter: { type: "date" }, render: (row) => date(row.approvedAt) },
          { id: "proofs", label: "Chứng từ", accessor: (row) => Number(row.proofCount), filter: { type: "number" }, render: (row) => `${row.proofCount} tệp` },
          { id: "progress", label: "Tiến độ nhận", accessor: (row) => Number(row.receivedAmount), filter: { type: "number" }, render: (row) => <span className="tabular-nums">{row.receiptCount ? `${row.receiptCount} đợt · ${money(row.receivedAmount)}/${money(row.total)}` : "Chưa nhận đợt nào"}</span> },
          { id: "total", label: "Giá trị", accessor: (row) => Number(row.total), filter: { type: "number" }, render: (row) => money(row.total) },
          { id: "action", label: "", sortable: false, hideable: false, exportable: false, render: (row) => <Button size="sm" render={<Link href={`/orders/${row.id}`} />}>Xác nhận</Button> },
        ]}
      />
    </DataState>
  </>;
}

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function newClientToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function OrderProofs({
  orderId,
  status,
  role,
  proofs,
  receivedAt,
  receivedByName,
  receiptNote,
  items,
  receiptEvents,
  onRefresh,
}: {
  orderId: number;
  status: string;
  role: Role;
  proofs: OrderProof[];
  receivedAt: string | null;
  receivedByName: string | null;
  receiptNote: string | null;
  items: ReceiptOrderItem[];
  receiptEvents: ReceiptEvent[];
  onRefresh: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [clientToken, setClientToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const canUpload = (status === "approved" && role !== "accountant") || (status === "delivered" && role === "admin");
  const canDelete = (proof: OrderProof) => role === "admin" || (status === "approved" && role !== "accountant" && !proof.receiptId);
  const receivedByItem = new Map<number, number>();
  for (const event of receiptEvents) for (const item of event.items) receivedByItem.set(item.orderItemId, (receivedByItem.get(item.orderItemId) ?? 0) + Number(item.qty));
  const unassignedProofs = proofs.filter((proof) => !proof.receiptId);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (unassignedProofs.length + files.length > 10) {
      toast.error("Mỗi đợt nhận chỉ được lưu tối đa 10 tệp.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      await api(`/api/orders/${orderId}/proofs`, { method: "POST", body: form });
      toast.success("Đã tải chứng từ lên.");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải chứng từ.");
    } finally {
      setUploading(false);
      if (cameraInput.current) cameraInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(proofId: number) {
    try {
      await api(`/api/orders/${orderId}/proofs/${proofId}`, { method: "DELETE" });
      toast.success("Đã xóa chứng từ.");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa chứng từ.");
    }
  }

  async function confirmReceipt() {
    setConfirming(true);
    try {
      const token = clientToken || newClientToken();
      if (!clientToken) setClientToken(token);
      await api(`/api/orders/${orderId}/confirm-receipt`, { method: "POST", ...jsonBody({
        note, receivedDate, clientToken: token,
        items: items.map((item) => ({ orderItemId: item.id, qty: Number(quantities[item.id] || 0) })),
      }) });
      toast.success("Đã ghi nhận đợt nhận hàng và cập nhật số liệu thực tế.");
      setNote("");
      setQuantities({});
      setClientToken("");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận nhận hàng.");
    } finally {
      setConfirming(false);
    }
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Paperclip className="size-4" aria-hidden="true" />Chứng từ nhận hàng</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {status === "delivered" && !receiptEvents.length ? <div className="rounded-xl bg-muted p-4 text-sm">
        <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Đã xác nhận nhận hàng</p>
        <p className="mt-1 text-muted-foreground">{receivedByName ?? "Không rõ người xác nhận"} · {date(receivedAt)}</p>
        {receiptNote ? <p className="mt-2 whitespace-pre-wrap">{receiptNote}</p> : null}
      </div> : null}

      {receiptEvents.length ? <section aria-labelledby="receipt-history-title" className="space-y-3">
        <div>
          <h3 id="receipt-history-title" className="font-medium">Lịch sử nhận hàng</h3>
          <p className="mt-1 text-sm text-muted-foreground">Mỗi đợt được lưu riêng theo ngày, số lượng và chứng từ.</p>
        </div>
        <div className="space-y-3">
          {receiptEvents.map((event) => <div key={event.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-medium"><PackageCheck className="size-4 text-emerald-600" aria-hidden="true" />Đợt {event.sequence}{event.isFinal ? " · Hoàn tất" : ""}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.receivedByName ?? "Không rõ người xác nhận"} · {date(event.receivedAt)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{proofs.filter((proof) => proof.receiptId === event.id).length} chứng từ</span>
            </div>
            <dl className="mt-3 divide-y text-sm">
              {event.items.map((item) => <div key={item.orderItemId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <dt className="min-w-0 truncate text-muted-foreground">{item.name}</dt>
                <dd className="shrink-0 font-medium tabular-nums">{Number(item.qty).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} {item.unit}</dd>
              </div>)}
            </dl>
            {event.note ? <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm">{event.note}</p> : null}
          </div>)}
        </div>
      </section> : null}

      {proofs.length ? <div className="grid gap-3 sm:grid-cols-2">
        {proofs.map((proof) => {
          const url = `/api/orders/${orderId}/proofs/${proof.id}`;
          const isImage = proof.mimeType.startsWith("image/");
          return <div key={proof.id} className="overflow-hidden rounded-xl border bg-background">
            {isImage ? <a href={url} target="_blank" rel="noreferrer" className="block bg-muted"><img src={url} alt={`Chứng từ ${proof.originalName}`} className="aspect-[4/3] w-full object-cover" /></a> : <a href={url} target="_blank" rel="noreferrer" className="flex aspect-[4/3] items-center justify-center bg-muted"><FileText className="size-12 text-muted-foreground" aria-hidden="true" /></a>}
            <div className="flex items-start gap-3 p-3">
              {isImage ? <ImageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={proof.originalName}>{proof.originalName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{fileSize(proof.size)} · {date(proof.createdAt)}</p>
              </div>
              <Button size="icon-sm" variant="ghost" render={<a href={url} target="_blank" rel="noreferrer" aria-label={`Mở ${proof.originalName}`} />}><ExternalLink aria-hidden="true" /></Button>
              {canDelete(proof) ? <ConfirmButton title={`Xóa “${proof.originalName}”?`} description="Tệp sẽ bị xóa khỏi lịch sử đơn." onConfirm={() => remove(proof.id)}><Trash2 aria-hidden="true" /> Xóa</ConfirmButton> : null}
            </div>
          </div>;
        })}
      </div> : <p className="text-sm text-muted-foreground">Chưa có ảnh hoặc phiếu xác thực.</p>}

      {canUpload ? <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void upload(event.target.files)} />
        <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => void upload(event.target.files)} />
        <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={uploading || unassignedProofs.length >= 10} onClick={() => cameraInput.current?.click()}><Camera aria-hidden="true" />Chụp ảnh cho đợt này</Button>
        <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={uploading || unassignedProofs.length >= 10} onClick={() => fileInput.current?.click()}><Upload aria-hidden="true" />{uploading ? "Đang tải…" : "Chọn ảnh/PDF"}</Button>
      </div> : null}

      {status === "approved" && role !== "accountant" ? <div className="space-y-3 border-t pt-4">
        <div>
          <h3 className="font-medium">Ghi nhận đợt nhận mới</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nhập số lượng thực tế vừa về. Đơn tự hoàn tất khi đã nhận đủ toàn bộ vật tư.</p>
        </div>
        <label className="block max-w-xs text-sm font-medium">Ngày nhận
          <span className="relative mt-1 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="date" max={new Date().toLocaleDateString("en-CA")} value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} /></span>
        </label>
        <div className="divide-y rounded-xl border">
          {items.map((item) => {
            const ordered = Number(item.qty);
            const received = receivedByItem.get(item.id) ?? 0;
            const remaining = Math.max(0, ordered - received);
            return <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Đã nhận {received.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}/{ordered.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} {item.unit} · Còn {remaining.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}</p>
              </div>
              <label className="text-sm font-medium">Nhận đợt này ({item.unit})
                <Input className="mt-1 tabular-nums" type="number" inputMode="decimal" min="0" max={remaining} step="0.001" disabled={remaining <= 0} value={quantities[item.id] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0" />
              </label>
            </div>;
          })}
        </div>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Ghi chú cho đợt nhận này (không bắt buộc)" aria-label="Ghi chú cho đợt nhận này" />
        <Button className="min-h-11 w-full sm:w-auto" disabled={confirming || uploading || !unassignedProofs.length || !Object.values(quantities).some((value) => Number(value) > 0)} onClick={() => void confirmReceipt()}><CheckCircle2 aria-hidden="true" />{confirming ? "Đang ghi nhận…" : "Ghi nhận đợt này"}</Button>
        {!unassignedProofs.length ? <p className="text-xs text-muted-foreground">Cần tải ít nhất một ảnh hoặc PDF mới cho mỗi đợt nhận.</p> : null}
      </div> : null}
    </CardContent>
  </Card>;
}

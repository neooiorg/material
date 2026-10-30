"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, ExternalLink, FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

export type OrderProof = {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string | null;
};

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

export function OrderProofs({
  orderId,
  status,
  role,
  proofs,
  receivedAt,
  receivedByName,
  receiptNote,
  onRefresh,
}: {
  orderId: number;
  status: string;
  role: Role;
  proofs: OrderProof[];
  receivedAt: string | null;
  receivedByName: string | null;
  receiptNote: string | null;
  onRefresh: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const canUpload = (status === "approved" && role !== "accountant") || (status === "delivered" && role === "admin");
  const canDelete = status === "approved" ? role !== "accountant" : role === "admin";

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (proofs.length + files.length > 10) {
      toast.error("Mỗi đơn chỉ được lưu tối đa 10 tệp.");
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
      await api(`/api/orders/${orderId}/confirm-receipt`, { method: "POST", ...jsonBody({ note }) });
      toast.success("Đã xác nhận nhận hàng. Số liệu thực tế đã được cập nhật.");
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
      {status === "delivered" ? <div className="rounded-xl bg-muted p-4 text-sm">
        <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Đã xác nhận nhận hàng</p>
        <p className="mt-1 text-muted-foreground">{receivedByName ?? "Không rõ người xác nhận"} · {date(receivedAt)}</p>
        {receiptNote ? <p className="mt-2 whitespace-pre-wrap">{receiptNote}</p> : null}
      </div> : null}

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
              {canDelete ? <ConfirmButton title={`Xóa “${proof.originalName}”?`} description="Tệp sẽ bị xóa khỏi lịch sử đơn." onConfirm={() => remove(proof.id)}><Trash2 aria-hidden="true" /> Xóa</ConfirmButton> : null}
            </div>
          </div>;
        })}
      </div> : <p className="text-sm text-muted-foreground">Chưa có ảnh hoặc phiếu xác thực.</p>}

      {canUpload ? <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void upload(event.target.files)} />
        <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => void upload(event.target.files)} />
        <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={uploading || proofs.length >= 10} onClick={() => cameraInput.current?.click()}><Camera aria-hidden="true" />Chụp ảnh</Button>
        <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={uploading || proofs.length >= 10} onClick={() => fileInput.current?.click()}><Upload aria-hidden="true" />{uploading ? "Đang tải…" : "Chọn ảnh/PDF"}</Button>
      </div> : null}

      {status === "approved" && role !== "accountant" ? <div className="space-y-3 border-t pt-4">
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Ghi chú khi nhận hàng (không bắt buộc)" aria-label="Ghi chú khi nhận hàng" />
        <Button className="w-full sm:w-auto" disabled={confirming || uploading || !proofs.length} onClick={() => void confirmReceipt()}><CheckCircle2 aria-hidden="true" />{confirming ? "Đang xác nhận…" : "Xác nhận đã nhận hàng"}</Button>
        {!proofs.length ? <p className="text-xs text-muted-foreground">Cần ít nhất một ảnh hoặc PDF trước khi xác nhận.</p> : null}
      </div> : null}
    </CardContent>
  </Card>;
}

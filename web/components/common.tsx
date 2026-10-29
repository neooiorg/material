"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { statusText } from "@/lib/format";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError("");
    api<T>(path).then((result) => { if (live) setData(result); }).catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path, revision]);
  return { data, error, loading, refresh };
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function DataState({ loading, error, children, retry }: { loading: boolean; error: string; children: React.ReactNode; retry?: () => void }) {
  if (loading) return <div className="grid gap-3" aria-busy="true"><div className="h-20 animate-pulse rounded-lg bg-muted"/><div className="h-64 animate-pulse rounded-lg bg-muted"/></div>;
  if (error) return <Card><CardContent className="space-y-3 py-6"><p role="alert" className="text-destructive">{error}</p>{retry && <Button variant="outline" onClick={retry}>Thử lại</Button>}</CardContent></Card>;
  return <>{children}</>;
}

export function Status({ value }: { value: string }) {
  return <Badge variant={value === "rejected" ? "destructive" : value === "approved" || value === "active" ? "default" : "secondary"}>{statusText[value] ?? value}</Badge>;
}

export function Field({ label, value, onChange, type = "text", required = false, placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; autoComplete?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete}/></div>;
}

export function NativeSelect({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={(next) => onChange(next ?? "")} required={required}><SelectTrigger id={id} className="h-9 w-full"><SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value || "__empty"} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

export function ConfirmButton({ title, description, onConfirm, children = "Xóa" }: { title: string; description: string; onConfirm: () => void | Promise<void>; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  async function confirm() {
    setPending(true);
    try { await onConfirm(); setOpen(false); }
    finally { setPending(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button size="sm" variant="destructive"/>}>{children}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline"/>}>Hủy</DialogClose><Button variant="destructive" disabled={pending} onClick={() => void confirm()}>{pending ? "Đang xóa…" : "Xóa"}</Button></DialogFooter></DialogContent></Dialog>;
}

export type Column<T> = { label: string; render: (row: T) => React.ReactNode };
export function DataGrid<T>({ rows, columns, search, searchText, empty = "Chưa có dữ liệu." }: { rows: T[]; columns: Column<T>[]; search?: string; searchText?: (row: T) => string; empty?: string }) {
  const [query, setQuery] = useState("");
  const filtered = searchText ? rows.filter((row) => searchText(row).toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))) : rows;
  return <div className="space-y-3">{search && <Input className="max-w-sm" aria-label={search} placeholder={search} value={query} onChange={(event) => setQuery(event.target.value)}/>}<div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.label}>{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.length ? filtered.map((row, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column.label}>{column.render(row)}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">{query ? "Không tìm thấy kết quả." : empty}</TableCell></TableRow>}</TableBody></Table></div></div>;
}

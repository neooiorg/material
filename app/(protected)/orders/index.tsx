import { useMemo, useState } from "react";
import { router, Stack } from "expo-router";
import { Button, Text } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { Screen, StateView, Empty } from "@/components/screen";
import { StatusChip } from "@/components/status-chip";
import { useApi } from "@/hooks/use-api";
import { formatDate, formatVND, statusLabels } from "@/lib/format";
type Row = { id: number; code: string; projectName: string; creatorName: string; supplierName?: string; createdAt: string; status: keyof typeof statusLabels; total: string };
export default function Orders() { const query = useApi<Row[]>("/api/orders"); const [descending, setDescending] = useState(true); const rows = useMemo(() => [...(query.data ?? [])].sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (descending ? -1 : 1)), [query.data, descending]); return <Screen><Stack.Screen options={{ title: "Đơn đặt vật tư" }} /><Button mode="outlined" onPress={() => setDescending((value) => !value)}>Ngày: {descending ? "mới nhất" : "cũ nhất"}</Button><StateView loading={query.loading} error={query.error} retry={query.refresh}>{rows.length === 0 ? <Empty>Chưa có đơn nào.</Empty> : <DataTable rows={rows} onPressRow={(row) => router.push(`/orders/${row.id}`)} searchPlaceholder="Tìm mã đơn, công trình, người tạo" getSearchText={(row) => `${row.code} ${row.projectName} ${row.creatorName}`} filters={[{ key: "status", label: "Tất cả trạng thái", options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })), matches: (row, value) => row.status === value }]} columns={[
  { key: "code", label: "Mã đơn", width: 116, render: (row) => <Text variant="labelMedium">{row.code}</Text> },
  { key: "project", label: "Công trình", width: 180, render: (row) => row.projectName },
  { key: "creator", label: "Người tạo", width: 150, render: (row) => row.creatorName },
  { key: "status", label: "Trạng thái", width: 126, render: (row) => <StatusChip status={row.status} /> },
  { key: "total", label: "Tổng tiền", width: 140, align: "right", render: (row) => <Text style={{ fontVariant: ["tabular-nums"] }}>{formatVND(row.total)}</Text> },
  { key: "date", label: "Ngày tạo", width: 116, render: (row) => formatDate(row.createdAt) },
]}/>}</StateView></Screen>; }

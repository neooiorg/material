import { useMemo, useState } from "react";
import { router, Stack } from "expo-router";
import { Button, TruncatedText } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { Empty, Screen, StateView } from "@/components/screen";
import { useApi } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";

type Row = { id: number; actorName: string; action: string; entityType: string; summary: string; createdAt: string };
const labels: Record<string, string> = { order: "Đơn hàng", payment: "Thanh toán", project: "Công trình", material: "Vật tư", budget: "Dự toán" };

export default function History() {
  const query = useApi<Row[]>("/api/activity");
  const [descending, setDescending] = useState(true);
  const rows = useMemo(() => [...(query.data ?? [])].sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (descending ? -1 : 1)), [query.data, descending]);
  return <Screen><Stack.Screen options={{ title: "Nhật ký hoạt động" }} />
    <Button mode="outlined" onPress={() => setDescending((value) => !value)}>Thời gian: {descending ? "mới nhất" : "cũ nhất"}</Button>
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{rows.length === 0 ? <Empty>Chưa có hoạt động nào.</Empty> : <DataTable
      rows={rows} onPressRow={(row) => router.push(`/details/activity/${row.id}` as never)}
      searchPlaceholder="Tìm người thực hiện, nội dung" getSearchText={(row) => `${row.actorName} ${row.action} ${row.summary} ${labels[row.entityType] ?? row.entityType}`}
      filters={[{ key: "type", label: "Tất cả loại", options: Object.entries(labels).map(([value, label]) => ({ value, label })), matches: (row, value) => row.entityType === value }]}
      columns={[{ key: "time", label: "Thời gian", width: 152, render: (row) => formatDateTime(row.createdAt) }, { key: "type", label: "Loại", width: 132, render: (row) => labels[row.entityType] ?? row.entityType }, { key: "actor", label: "Người thực hiện", width: 166, render: (row) => <TruncatedText title="Người thực hiện" lines={2} variant="labelMedium">{row.actorName}</TruncatedText> }, { key: "content", label: "Nội dung", width: 280, render: (row) => row.summary }]}
    />}</StateView>
  </Screen>;
}

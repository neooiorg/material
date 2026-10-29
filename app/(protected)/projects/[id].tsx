import { router, Stack, useLocalSearchParams } from "expo-router";
import { Card, InfoRow, Text } from "@/components/ui";
import { InlineEmpty, Screen, StateView } from "@/components/screen";
import { DonutChart, ProgressBar } from "@/components/charts";
import { StatusChip } from "@/components/status-chip";
import { DataTable } from "@/components/data-table";
import { useApi } from "@/hooks/use-api";
import { formatNumber, formatVND, statusLabels } from "@/lib/format";
import { colors, spacing } from "@/theme";

type Data = {
  project: { code: string; name: string; address?: string };
  totalBudget: number; totalActual: number; totalDiff: number;
  statusRows: { status: keyof typeof statusLabels; value: number }[];
  suppliers: { id: number; name: string; phone: string }[];
  defaultSupplier?: { id: number; name: string; phone: string } | null;
  neededMaterials: { materialId: number; name: string; unit: string; remainingQty: number }[];
  recentOrders: { id: number; code: string; status: keyof typeof statusLabels; total: number }[];
};

export default function ProjectSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useApi<Data>(`/api/projects/${id}/summary`);
  const data = query.data;
  return <Screen>
    <Stack.Screen options={{ title: "Tổng hợp công trình" }} />
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{data && <>
      <Card>
        <Card.Title title={data.project.name} subtitle={`${data.project.code}${data.project.address ? ` · ${data.project.address}` : ""}`} />
        <Card.Content style={{ gap: spacing.md }}>
          <InfoRow label="Dự toán" value={formatVND(data.totalBudget)} tone="info" />
          <InfoRow label="Thực tế" value={formatVND(data.totalActual)} tone="primary" />
          <InfoRow label="Chênh lệch" value={formatVND(data.totalDiff)} tone={data.totalDiff > 0 ? "danger" : "success"} />
          <ProgressBar label="Thực tế / Dự toán" value={data.totalActual} total={data.totalBudget} tint={data.totalActual > data.totalBudget ? colors.danger : colors.primary} />
        </Card.Content>
      </Card>
      <Card><Card.Title title="Tình hình đơn" /><Card.Content>{data.statusRows.length ? <DonutChart centerLabel="Đơn" data={data.statusRows.map((row) => ({ name: statusLabels[row.status], value: row.value }))} /> : <InlineEmpty icon="🧾">Chưa có đơn đặt.</InlineEmpty>}</Card.Content></Card>
      <Card><Card.Title title="Đơn gần đây" /><Card.Content>{data.recentOrders.length ? <DataTable rows={data.recentOrders} onPressRow={(order) => router.push(`/orders/${order.id}`)} columns={[
        { key: "code", label: "Mã đơn", width: 116, render: (order) => <Text variant="labelMedium">{order.code}</Text> },
        { key: "status", label: "Trạng thái", width: 126, render: (order) => <StatusChip status={order.status} /> },
        { key: "total", label: "Tổng tiền", width: 140, align: "right", render: (order) => <Text style={{ fontVariant: ["tabular-nums"] }}>{formatVND(order.total)}</Text> },
      ]} /> : <InlineEmpty icon="🧾">Chưa có đơn đặt.</InlineEmpty>}</Card.Content></Card>
      <Card><Card.Title title="Vật tư cần đặt" /><Card.Content>{data.neededMaterials.length ? <DataTable rows={data.neededMaterials.map((row) => ({ ...row, id: row.materialId }))} onPressRow={(row) => router.push(`/details/material/${row.materialId}` as never)} columns={[
        { key: "name", label: "Vật tư", width: 190, render: (row) => row.name },
        { key: "quantity", label: "Còn cần đặt", width: 150, align: "right", render: (row) => `${formatNumber(row.remainingQty)} ${row.unit}` },
      ]} /> : <InlineEmpty icon="✅">Không còn vật tư cần đặt.</InlineEmpty>}</Card.Content></Card>
      <Card><Card.Title title="Đơn vị cung cấp" /><Card.Content>{data.suppliers.length ? <DataTable rows={data.suppliers} onPressRow={(item) => router.push(`/details/supplier-contact/${item.id}` as never)} columns={[
        { key: "name", label: "Đơn vị", width: 190, render: (item) => item.name },
        { key: "phone", label: "Số Zalo", width: 145, render: (item) => item.phone },
        { key: "default", label: "Mặc định", width: 105, render: (item) => item.id === data.defaultSupplier?.id ? "Có" : "—" },
      ]} /> : <InlineEmpty icon="☎️">Chưa liên kết đơn vị cung cấp.</InlineEmpty>}</Card.Content></Card>
    </>}</StateView>
  </Screen>;
}

import { useState } from "react";
import { router, Stack } from "expo-router";
import { Card, InfoRow, Text, TruncatedText } from "@/components/ui";
import { Empty, Screen, StateView } from "@/components/screen";
import { SelectMenu } from "@/components/select-menu";
import { GroupedBarChart } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { useApi } from "@/hooks/use-api";
import { formatNumber, formatPercent, formatVND } from "@/lib/format";
import { colors } from "@/theme";

type Data = {
  projects: { id: number; code: string; name: string }[];
  selectedId: number | null;
  totalBudget: number;
  totalActual: number;
  totalDiff: number;
  rows: { materialId: number; name: string; unit: string; group: string; budgetQty: number; budgetAmount: number; actualQty: number; actualAmount: number }[];
};

export default function Reconcile() {
  const [project, setProject] = useState("");
  const query = useApi<Data>(`/api/reconcile${project ? `?projectId=${project}` : ""}`);
  const data = query.data;
  return <Screen>
    <Stack.Screen options={{ title: "Đối chiếu dự toán / thực tế" }} />
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>
      {data && <>
        <SelectMenu value={String(data.selectedId ?? "")} onChange={setProject} label="Chọn công trình" options={data.projects.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))} />
        <Card><Card.Content>
          <InfoRow label="Dự toán" value={formatVND(data.totalBudget)} tone="info" />
          <InfoRow label="Thực tế" value={formatVND(data.totalActual)} tone="primary" />
          <InfoRow label="Chênh lệch" value={formatVND(data.totalDiff)} tone={data.totalDiff > 0 ? "danger" : "success"} />
        </Card.Content></Card>
        {data.rows.length > 0 && <Card><Card.Title title="Biểu đồ dự toán vs thực tế" /><Card.Content><GroupedBarChart money data={data.rows.map((row) => ({ name: row.name, budget: row.budgetAmount, actual: row.actualAmount }))} /></Card.Content></Card>}
        {data.rows.length === 0 ? <Empty>Chưa có dự toán hoặc phát sinh thực tế.</Empty> : <DataTable
          rows={data.rows.map((row) => ({ ...row, id: row.materialId }))}
          onPressRow={(row) => router.push(`/details/material/${row.materialId}` as never)}
          searchPlaceholder="Tìm vật tư"
          getSearchText={(row) => `${row.name} ${row.group} ${row.unit}`}
          filters={[{ key: "variance", label: "Tất cả chênh lệch", options: [{ value: "over", label: "Vượt dự toán" }, { value: "within", label: "Trong dự toán" }, { value: "outside", label: "Ngoài dự toán" }], matches: (row, value) => value === "over" ? row.actualAmount > row.budgetAmount && row.budgetAmount > 0 : value === "outside" ? row.budgetAmount === 0 && row.actualAmount > 0 : row.actualAmount <= row.budgetAmount && row.budgetAmount > 0 }]}
          columns={[
            { key: "material", label: "Vật tư", width: 185, render: (row) => <><TruncatedText title="Vật tư" lines={2} variant="labelMedium">{row.name}</TruncatedText><TruncatedText title="Nhóm · đơn vị" variant="labelSmall" style={{ color: colors.textMuted }}>{row.group} · {row.unit}</TruncatedText></> },
            { key: "budgetQty", label: "SL dự toán", width: 138, align: "right", render: (row) => `${formatNumber(row.budgetQty)} ${row.unit}` },
            { key: "actualQty", label: "SL thực tế", width: 138, align: "right", render: (row) => `${formatNumber(row.actualQty)} ${row.unit}` },
            { key: "budget", label: "Tiền dự toán", width: 146, align: "right", render: (row) => formatVND(row.budgetAmount) },
            { key: "actual", label: "Tiền thực tế", width: 146, align: "right", render: (row) => formatVND(row.actualAmount) },
            { key: "variance", label: "Chênh lệch", width: 150, render: (row) => row.budgetAmount === 0 && row.actualAmount > 0 ? "Ngoài dự toán" : `${formatPercent(row.budgetAmount ? row.actualAmount / row.budgetAmount * 100 : 0)} so dự toán` },
          ]}
        />}
      </>}
    </StateView>
  </Screen>;
}

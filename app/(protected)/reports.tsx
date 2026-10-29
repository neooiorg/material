import { useState } from "react";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetch } from "expo/fetch";
import { router as expoRouter, Stack } from "expo-router";
import { Button, Card, InfoRow, Text, TruncatedText } from "@/components/ui";
import { Screen, StateView } from "@/components/screen";
import { SelectMenu } from "@/components/select-menu";
import { BarChart, DonutChart } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { useApi } from "@/hooks/use-api";
import { authClient } from "@/lib/auth-client";
import { formatNumber, formatVND } from "@/lib/format";
import { fonts } from "@/theme";
import { apiBaseUrl } from "@/lib/runtime-config";
import { useNotice } from "@/components/snackbar";
import { MonthPicker } from "@/components/month-picker";

const router = expoRouter as unknown as { push: (href: string) => void };

type Data = { month: string; label: string; projects: { id: number; code: string; name: string }[]; materialStats: { materialId: number; name: string; group: string; qty: number; unit: string; amount: number }[]; totalCost: number; groupData: { name: string; value: number }[] };

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [project, setProject] = useState("all");
  const path = `/api/reports?month=${month}${project !== "all" ? `&projectId=${project}` : ""}`;
  const query = useApi<Data>(path);
  const notice = useNotice();

  async function exportCsv() {
    try {
      if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_URL chưa được cấu hình.");
      const cookie = await authClient.getCookie();
      const response = await fetch(`${apiBaseUrl}/api/reports/export?month=${month}${project !== "all" ? `&projectId=${project}` : ""}`, { credentials: process.env.EXPO_OS === "web" ? "include" : "omit", headers: cookie ? { Cookie: cookie } : undefined });
      if (!response.ok) throw new Error("Không thể xuất báo cáo.");
      const csv = await response.text();
      const file = new File(Paths.cache, `thong-ke-${month}.csv`);
      file.create({ overwrite: true });
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
    } catch (error) {
      notice(error instanceof Error ? error.message : "Không thể xuất báo cáo.");
    }
  }

  return <Screen><Stack.Screen options={{ title: "Thống kê chi phí" }} />
    <MonthPicker label="Tháng báo cáo" value={month} onChange={setMonth} />
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data && <>
      <SelectMenu value={project} onChange={setProject} options={[{ value: "all", label: "Tất cả công trình" }, ...query.data.projects.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))]} />
      <Button mode="outlined" icon="download" onPress={exportCsv}>Xuất CSV</Button>
      <Card><Card.Content><InfoRow label={`Chi phí đơn đã duyệt · ${query.data.label}`} value={formatVND(query.data.totalCost)} tone="info" /></Card.Content></Card>
      {query.data.groupData.length > 0 && <Card><Card.Title title="Cơ cấu theo nhóm" /><Card.Content><DonutChart money centerLabel="Chi phí" data={query.data.groupData} /></Card.Content></Card>}
      <Card><Card.Title title="Chi phí theo vật tư" /><Card.Content><DataTable rows={query.data.materialStats.map((row) => ({ ...row, id: row.materialId }))} onPressRow={(row) => router.push(`/details/material/${row.materialId}`)} searchPlaceholder="Tìm vật tư trong báo cáo" getSearchText={(row) => `${row.name} ${row.group} ${row.unit}`} filters={[{ key: "group", label: "Tất cả nhóm", options: [...new Set(query.data.materialStats.map((row) => row.group))].map((value) => ({ value, label: value })), matches: (row, value) => row.group === value }]} columns={[{ key: "name", label: "Vật tư", width: 190, render: (row) => <TruncatedText title="Vật tư" lines={2} variant="labelMedium">{row.name}</TruncatedText> }, { key: "group", label: "Nhóm", width: 140, render: (row) => row.group }, { key: "qty", label: "Số lượng", width: 134, align: "right", render: (row) => `${formatNumber(row.qty)} ${row.unit}` }, { key: "amount", label: "Chi phí", width: 148, align: "right", render: (row) => <TruncatedText title="Chi phí" lines={2} style={{ fontVariant: ["tabular-nums"], fontFamily: fonts.semibold, textAlign: "right" }}>{formatVND(row.amount)}</TruncatedText> }]}/></Card.Content></Card>
    </>}</StateView>
  </Screen>;
}

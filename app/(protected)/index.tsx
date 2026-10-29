import { View } from "react-native";
import { router, Stack } from "expo-router";
import { AppIcon, Button, Card, Text, TruncatedText } from "@/components/ui";
import { Screen, StateView } from "@/components/screen";
import { DonutChart } from "@/components/charts";
import { StatusChip } from "@/components/status-chip";
import { DataTable } from "@/components/data-table";
import { useApi } from "@/hooks/use-api";
import { authClient, type AppUser } from "@/lib/auth-client";
import { formatDateTime, formatVND, roleLabels, statusLabels } from "@/lib/format";
import { colors, fonts, radius, spacing } from "@/theme";
type Data = { projectCount: number; pendingCount: number; approvedCount: number; materialCount: number; approvedMonth: number; statusRows: { status: keyof typeof statusLabels; value: number }[]; recentOrders: { id: number; code: string; status: keyof typeof statusLabels; total: string; createdAt: string; projectName: string; creatorName: string }[] };
export default function Dashboard() {
  const query = useApi<Data>("/api/dashboard");
  const user = authClient.useSession().data?.user as AppUser | undefined;
  const quick = user?.role === "site" ? ["Đặt vật tư", "/orders/new"] : user?.role === "admin" ? ["Duyệt đơn", "/approvals"] : ["Thống kê", "/reports"];
  const quickLabel = quick[0] === "Đặt vật tư" ? "Đặt\nvật tư" : quick[0];
  return <Screen>
    <Stack.Screen options={{ title: "Tổng quan" }} />
    <View style={{ gap: 2 }}>
      <Text selectable variant="headlineSmall">Xin chào, {user?.name}</Text>
      <Text selectable style={{ color: colors.textSecondary }}>{user ? `Bảng điều khiển ${roleLabels[user.role]}` : ""}</Text>
    </View>
    <Button mode="contained" icon="plus" contentStyle={{ minHeight: 56 }} onPress={() => router.push(quick[1] as never)}>{quickLabel}</Button>
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <Metric label="Công trình" value={query.data.projectCount} icon="office-building" tint={colors.primary} />
        <Metric label="Chờ duyệt" value={query.data.pendingCount} icon="clipboard-list-outline" tint={colors.warning} />
        <Metric label="Đã duyệt" value={query.data.approvedCount} icon="check-decagram-outline" tint={colors.info} />
        <Metric label="Vật tư" value={query.data.materialCount} icon="package-variant" tint={colors.success} />
      </View>
      <Card>
        <Card.Title title="Tài chính" />
        <Card.Content style={{ gap: spacing.md }}>
          <FinanceRow label="Đã duyệt trong tháng" value={formatVND(query.data.approvedMonth)} tint={colors.info} />
        </Card.Content>
      </Card>
      <Card>
        <Card.Title title="Đơn theo trạng thái" />
        <Card.Content><DonutChart centerLabel="Đơn" data={query.data.statusRows.map((row) => ({ name: statusLabels[row.status], value: row.value }))} /></Card.Content>
      </Card>
      <Text variant="titleMedium">Đơn đặt gần đây</Text>
      <DataTable rows={query.data.recentOrders} onPressRow={(order) => router.push(`/orders/${order.id}`)} columns={[
        { key: "code", label: "Mã đơn", width: 112, render: (order) => <Text variant="labelMedium">{order.code}</Text> },
        { key: "project", label: "Công trình", width: 176, render: (order) => order.projectName },
        { key: "status", label: "Trạng thái", width: 126, render: (order) => <StatusChip status={order.status} /> },
        { key: "total", label: "Tổng tiền", width: 142, align: "right", render: (order) => <Text style={{ fontVariant: ["tabular-nums"] }}>{formatVND(order.total)}</Text> },
        { key: "date", label: "Thời gian", width: 150, render: (order) => formatDateTime(order.createdAt) },
      ]}/>
    </>}</StateView>
  </Screen>;
}
function Metric({ label, value, icon, tint }: { label: string; value: number; icon: string; tint: string }) {
  return <Card style={{ minWidth: "44%", flexGrow: 1 }}>
    <Card.Content style={{ gap: spacing.sm }}>
      <View style={{ width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: `${tint}1A` }}><AppIcon name={icon} color={tint} size={20} /></View>
      <Text selectable style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.text }}>{value}</Text>
      <Text selectable style={{ color: colors.textSecondary }}>{label}</Text>
    </Card.Content>
  </Card>;
}
function FinanceRow({ label, value, tint }: { label: string; value: string; tint: string }) {
  return <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
    <TruncatedText title={label} style={{ color: colors.textSecondary, flex: 1 }}>{label}</TruncatedText>
    <TruncatedText title={label} lines={2} style={{ fontFamily: fonts.semibold, fontSize: 16, color: tint, maxWidth: 172, textAlign: "right" }}>{value}</TruncatedText>
  </View>;
}

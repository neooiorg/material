import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { Empty, Screen, StateView } from "@/components/screen";
import { useApi } from "@/hooks/use-api";
import { formatDateTime, formatNumber, formatVND } from "@/lib/format";
import { colors, spacing } from "@/theme";

type Definition = {
  title: string;
  endpoint: string;
  fields: { key: string; label: string; format?: (value: unknown) => string }[];
};

const definitions: Record<string, Definition> = {
  material: { title: "Chi tiết vật tư", endpoint: "/api/materials", fields: [{ key: "code", label: "Mã vật tư" }, { key: "name", label: "Tên vật tư" }, { key: "group", label: "Nhóm" }, { key: "unit", label: "Đơn vị tính" }] },
  "supplier-contact": { title: "Chi tiết đơn vị cung cấp", endpoint: "/api/supplier-contacts", fields: [{ key: "name", label: "Tên đơn vị" }, { key: "phone", label: "Số Zalo" }] },
  activity: { title: "Chi tiết hoạt động", endpoint: "/api/activity", fields: [{ key: "entityType", label: "Loại dữ liệu" }, { key: "actorName", label: "Người thực hiện" }, { key: "action", label: "Thao tác" }, { key: "summary", label: "Nội dung" }, { key: "createdAt", label: "Thời gian", format: (value) => formatDateTime(String(value)) }] },
  notification: { title: "Chi tiết thông báo", endpoint: "/api/notifications", fields: [{ key: "title", label: "Tiêu đề" }, { key: "message", label: "Nội dung" }, { key: "isRead", label: "Trạng thái", format: (value) => value ? "Đã đọc" : "Chưa đọc" }, { key: "createdAt", label: "Thời gian", format: (value) => formatDateTime(String(value)) }] },
  budget: { title: "Chi tiết dòng dự toán", endpoint: "/api/budgets", fields: [{ key: "name", label: "Vật tư" }, { key: "unit", label: "Đơn vị" }, { key: "qty", label: "Số lượng", format: (value) => formatNumber(value) }, { key: "unitPrice", label: "Đơn giá", format: (value) => formatVND(value) }] },
};

export default function TableRowDetail() {
  const { resource, id, projectId } = useLocalSearchParams<{ resource: string; id: string; projectId?: string }>();
  const definition = definitions[resource ?? ""];
  const endpoint = resource === "budget" ? `${definition?.endpoint}?projectId=${projectId ?? "0"}` : definition?.endpoint;
  const query = useApi<Record<string, unknown>[]>(endpoint);
  const row = query.data?.find((item) => String(item.id) === id);

  return <Screen><Stack.Screen options={{ title: definition?.title ?? "Chi tiết" }} />
    {!definition ? <Empty>Loại dữ liệu không được hỗ trợ.</Empty> : <StateView loading={query.loading} error={query.error} retry={query.refresh}>{row ? <Card><Card.Content style={{ gap: spacing.lg }}>
      {definition.fields.map((field) => <View key={field.key} style={{ gap: spacing.xs, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.border }}><Text selectable={false} variant="labelSmall" style={{ color: colors.textMuted }}>{field.label}</Text><Text selectable>{field.format ? field.format(row[field.key]) : String(row[field.key] ?? "—")}</Text></View>)}
      {resource === "notification" && typeof row.orderId === "number" && <Button mode="outlined" onPress={() => router.push(`/orders/${row.orderId}`)}>Mở đơn liên quan</Button>}
    </Card.Content></Card> : <Empty>Không tìm thấy dữ liệu chi tiết.</Empty>}</StateView>}
  </Screen>;
}

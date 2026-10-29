import { router, Stack } from "expo-router";
import { Button, Text, TruncatedText } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { Empty, Screen, StateView } from "@/components/screen";
import { useApi } from "@/hooks/use-api";
import { api, jsonBody } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type Item = { id: number; title: string; message: string; orderId?: number; isRead: boolean; createdAt: string };

export default function Notifications() {
  const query = useApi<Item[]>("/api/notifications");
  async function markRead(item?: Item) { await api("/api/notifications/read", { method: "PATCH", ...jsonBody(item ? { ids: [item.id] } : {}) }); query.refresh(); }
  function view(item: Item) { void markRead(item); router.push(`/details/notification/${item.id}` as never); }
  return <Screen><Stack.Screen options={{ title: "Thông báo" }} />
    <Button mode="outlined" disabled={!query.data?.some((item) => !item.isRead)} onPress={() => { void markRead(); }}>Đánh dấu tất cả đã đọc</Button>
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{!query.data?.length ? <Empty>Chưa có thông báo nào.</Empty> : <DataTable
      rows={query.data} onPressRow={view} searchPlaceholder="Tìm thông báo" getSearchText={(item) => `${item.title} ${item.message}`}
      filters={[{ key: "read", label: "Tất cả trạng thái", options: [{ value: "unread", label: "Chưa đọc" }, { value: "read", label: "Đã đọc" }], matches: (item, value) => value === "read" ? item.isRead : !item.isRead }]}
      columns={[{ key: "status", label: "Trạng thái", width: 120, render: (item) => <Text variant="labelMedium">{item.isRead ? "Đã đọc" : "Chưa đọc"}</Text> }, { key: "title", label: "Tiêu đề", width: 190, render: (item) => <TruncatedText title="Tiêu đề" lines={2} variant="labelMedium">{item.title}</TruncatedText> }, { key: "message", label: "Nội dung", width: 290, render: (item) => item.message }, { key: "time", label: "Thời gian", width: 152, render: (item) => formatDateTime(item.createdAt) }]}
    />}</StateView>
  </Screen>;
}

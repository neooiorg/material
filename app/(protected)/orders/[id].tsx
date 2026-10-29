import { Stack, useLocalSearchParams } from "expo-router";
import { Card, Divider, InfoRow, Text, TruncatedText } from "@/components/ui";
import { Screen, StateView } from "@/components/screen";
import { StatusChip } from "@/components/status-chip";
import { DataTable } from "@/components/data-table";
import { OrderActions } from "@/components/order-actions";
import { useApi } from "@/hooks/use-api";
import { authClient, type AppUser } from "@/lib/auth-client";
import { formatDateTime, formatNumber, formatVND, statusLabels } from "@/lib/format";
import { colors } from "@/theme";

type Order = {
  id: number;
  code: string;
  status: keyof typeof statusLabels;
  note?: string;
  rejectedReason?: string;
  total: string;
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
  projectName: string;
  creatorName: string;
  supplierContact?: { name: string; phone: string } | null;
  items: { id: number; name: string; unit: string; group: string; qty: string; unitPrice: string; amount: string }[];
  timeline: { id: number; summary: string; actorName: string; createdAt: string }[];
};

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useApi<Order>(`/api/orders/${id}`);
  const user = authClient.useSession().data?.user as AppUser | undefined;
  const order = query.data;
  const canApprove = !!order && order.status === "pending" && user?.role === "admin";

  return (
    <Screen>
      <Stack.Screen options={{ title: order ? `Đơn ${order.code}` : "Chi tiết đơn" }} />
      <StateView loading={query.loading} error={query.error} retry={query.refresh}>
        {order && (
          <>
            <StatusChip status={order.status} />

            <Card>
              <Card.Title title="Thông tin" subtitle={order.code} />
              <Card.Content>
                <InfoRow label="Công trình" value={order.projectName} />
                <InfoRow label="Người tạo" value={order.creatorName} />
                <InfoRow label="Đơn vị liên hệ" value={order.supplierContact ? `${order.supplierContact.name} · ${order.supplierContact.phone}` : "Chưa chọn"} />
                <InfoRow label="Ngày tạo" value={formatDateTime(order.createdAt)} />
                {order.approvedAt ? <InfoRow label="Ngày duyệt" value={formatDateTime(order.approvedAt)} /> : null}
                {order.deliveredAt ? <InfoRow label="Ngày giao (dữ liệu cũ)" value={formatDateTime(order.deliveredAt)} /> : null}
              </Card.Content>
            </Card>

            <Card>
              <Card.Title title="Chi tiết vật tư" />
              <Card.Content style={{ gap: 10 }}>
                <DataTable
                  rows={order.items}
                  searchPlaceholder="Tìm vật tư trong đơn"
                  getSearchText={(item) => `${item.name} ${item.group} ${item.unit}`}
                  pageSize={8}
                  columns={[
                    { key: "name", label: "Vật tư", width: 190, render: (item) => <><TruncatedText title="Vật tư" lines={2} variant="labelMedium">{item.name}</TruncatedText><TruncatedText title="Nhóm vật tư" variant="labelSmall" style={{ color: colors.textMuted }}>{item.group}</TruncatedText></> },
                    { key: "qty", label: "Số lượng", width: 128, align: "right", render: (item) => `${formatNumber(item.qty)} ${item.unit}` },
                    { key: "price", label: "Đơn giá", width: 142, align: "right", render: (item) => formatVND(item.unitPrice) },
                    { key: "amount", label: "Thành tiền", width: 150, align: "right", render: (item) => formatVND(item.amount) },
                  ]}
                />
                <Divider />
                <InfoRow label="Tổng cộng" value={formatVND(order.total)} tone="primary" />
              </Card.Content>
            </Card>

            {order.note ? <Card><Card.Title title="Ghi chú nội bộ" /><Card.Content><Text selectable>{order.note}</Text></Card.Content></Card> : null}
            {order.rejectedReason ? <Card><Card.Title title="Lý do từ chối" /><Card.Content><Text selectable style={{ color: colors.danger }}>{order.rejectedReason}</Text></Card.Content></Card> : null}

            <Card>
              <Card.Title title="Diễn biến đơn" />
              <Card.Content style={{ gap: 10 }}>
                {order.timeline.map((event) => (
                  <Text selectable key={event.id}>
                    • {event.summary}{"\n"}  {event.actorName} · {formatDateTime(event.createdAt)}
                  </Text>
                ))}
              </Card.Content>
            </Card>

            {canApprove ? <OrderActions orderId={order.id} canApprove={canApprove} onDone={query.refresh} /> : null}
          </>
        )}
      </StateView>
    </Screen>
  );
}

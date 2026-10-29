import { Stack } from "expo-router";
import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { Screen } from "@/components/screen";
import { colors, radius, spacing } from "@/theme";

const sections = [
  { title: "Giới thiệu", text: "Ứng dụng nội bộ giúp Bộ phận thi công tạo nhu cầu vật tư, Admin duyệt đơn, Kế toán theo dõi chi phí và đối chiếu dự toán/thực tế." },
  { title: "Vai trò", text: "Admin quản lý cấu hình và thành viên. Bộ phận thi công tạo đơn. Kế toán xem đơn, báo cáo, đối chiếu và tổng hợp công trình. Nhà cung cấp không đăng nhập app." },
  { title: "Nhà cung cấp", text: "Nhà cung cấp chỉ là danh bạ liên hệ. Sau khi đơn được duyệt, nhân viên có thể mở Zalo với nội dung cần đặt; nội dung không chứa giá, ngân sách hay ghi chú nội bộ." },
  { title: "Thông báo email", text: "Backend dùng Resend để gửi email mời người và thông báo đơn mới/đã duyệt/bị từ chối khi đã cấu hình RESEND_API_KEY." },
];

const flow = [
  { actor: "Admin", action: "Cấu hình nền", detail: "Công trình, vật tư, dự toán, danh bạ Zalo và thành viên." },
  { actor: "Bộ phận thi công", action: "Tạo đơn đặt vật tư", detail: "Chọn công trình, vật tư cần đặt và đơn vị liên hệ liên quan." },
  { actor: "Admin", action: "Duyệt hoặc từ chối", detail: "Đơn duyệt sẽ cập nhật số liệu thực tế; đơn từ chối lưu lý do." },
  { actor: "Zalo ngoài app", action: "Gửi nội dung cần đặt", detail: "Chỉ gửi mã đơn, công trình, vật tư, số lượng và đơn vị tính." },
  { actor: "Kế toán", action: "Theo dõi đối chiếu", detail: "Xem dự toán/thực tế/chênh lệch, thống kê chi phí và xuất CSV." },
] as const;

const roleLanes = [
  { role: "Admin", items: ["Mời/sửa/xóa thành viên", "Duyệt đơn", "Quản lý danh mục"] },
  { role: "Bộ phận thi công", items: ["Tạo đơn", "Xem đơn của mình", "Gửi Zalo khi đơn đã duyệt"] },
  { role: "Kế toán", items: ["Xem báo cáo", "Đối chiếu công trình", "Xuất CSV"] },
  { role: "Nhà cung cấp", items: ["Không đăng nhập app", "Chỉ nhận nội dung qua Zalo"] },
] as const;

export default function Docs() {
  return <Screen><Stack.Screen options={{ title: "Tài liệu hệ thống" }} />
    <Card>
      <Card.Title title="Sơ đồ luồng hoạt động" subtitle="App chỉ dành cho nhân sự nội bộ; nhà cung cấp là liên hệ bên ngoài." />
      <Card.Content>
        <View style={{ gap: spacing.md }}>
          {flow.map((step, index) => (
            <View key={`${step.actor}-${step.action}`} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
                <View style={{ width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Text selectable={false} variant="labelMedium" style={{ color: colors.primary }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }}>
                  <Text selectable variant="labelMedium">{step.actor}</Text>
                  <Text selectable variant="titleSmall">{step.action}</Text>
                  <Text selectable style={{ color: colors.textSecondary }}>{step.detail}</Text>
                </View>
              </View>
              {index < flow.length - 1 ? (
                <View style={{ marginLeft: 16, width: 2, height: 18, backgroundColor: colors.primaryBorder }} />
              ) : null}
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
    <Card>
      <Card.Title title="Vai trò và phạm vi" />
      <Card.Content>
        <View style={{ gap: spacing.sm }}>
          {roleLanes.map((lane) => (
            <View key={lane.role} style={{ padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: lane.role === "Nhà cung cấp" ? colors.warningContainer : colors.surface }}>
              <Text variant="titleSmall">{lane.role}</Text>
              <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                {lane.items.map((item) => <Text key={item} style={{ color: colors.textSecondary }}>• {item}</Text>)}
              </View>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
    {sections.map((item) => <Card key={item.title}><Card.Title title={item.title} /><Card.Content><Text selectable>{item.text}</Text></Card.Content></Card>)}
  </Screen>;
}

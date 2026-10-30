import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/common";

const steps = [
  ["Quản trị", "Chuẩn bị dữ liệu", "Tạo công trình, vật tư, dự toán, danh bạ liên hệ và mời thành viên."],
  ["Thi công", "Tạo đơn vật tư", "Chọn công trình, vật tư và đơn vị cung cấp liên quan."],
  ["Quản trị", "Duyệt đơn", "Đơn được duyệt chuyển sang danh sách chờ nhận hàng."],
  ["Thi công / Quản trị", "Xác nhận nhận hàng", "Khi hàng tới, chụp ảnh hoặc đính kèm phiếu rồi xác nhận một lần."],
  ["Hệ thống", "Ghi nhận thực tế", "Số lượng và chi phí chỉ được cộng vào thống kê sau khi có xác nhận nhận hàng."],
  ["Kế toán", "Đối chiếu chi phí", "Xem dự toán, thực tế đã nhận, thống kê tháng và xuất báo cáo CSV."],
];

export function Docs() {
  return <><PageTitle title="Tài liệu hệ thống" description="Quy trình đặt và xác nhận vật tư dành cho nhân sự nội bộ." action={<Button variant="outline" render={<Link href="/"/>}>Về trang chính</Button>}/><div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"><Card><CardHeader><CardTitle>Luồng làm việc</CardTitle></CardHeader><CardContent className="space-y-3">{steps.map(([actor, action, detail], index) => <div key={action} className="flex gap-3 border-b pb-3 last:border-0"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{index + 1}</span><div><p className="text-xs font-medium text-muted-foreground">{actor}</p><p className="font-medium">{action}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div></div>)}</CardContent></Card><div className="space-y-4"><Card><CardHeader><CardTitle>Vai trò</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><strong>Quản trị:</strong> Quản lý danh mục, duyệt đơn, xác nhận thay và quản lý chứng từ sau xác nhận.</p><p><strong>Bộ phận thi công:</strong> Tạo đơn, xác nhận đơn của mình khi hàng tới và tải ảnh hoặc phiếu.</p><p><strong>Kế toán:</strong> Xem đơn, chứng từ, đối chiếu và xuất báo cáo thực tế đã nhận.</p></CardContent></Card><Card><CardHeader><CardTitle>Đơn vị cung cấp</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Đơn vị cung cấp là liên hệ bên ngoài, không đăng nhập. Nội dung gửi qua Zalo không gồm giá, ngân sách hoặc ghi chú nội bộ.</CardContent></Card></div></div></>;
}

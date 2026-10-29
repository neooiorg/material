import Link from "next/link";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DocsToc, type TocItem } from "./docs-toc";
import {
  Building2,
  PackagePlus,
  CheckSquare,
  Truck,
  Scale,
  BarChart3,
  Bell,
  History,
  Boxes,
  Wallet,
  ArrowRight,
  ShieldCheck,
  LogIn,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Tài liệu hệ thống — Quản lý đặt vật tư công trình",
  description:
    "Mô tả và hướng dẫn sử dụng nền tảng quản lý đặt vật tư công trình.",
};

const TOC: TocItem[] = [
  { id: "gioi-thieu", label: "Giới thiệu" },
  { id: "vai-tro", label: "Vai trò & phân quyền" },
  { id: "luong", label: "Luồng nghiệp vụ" },
  { id: "tinh-nang", label: "Tính năng chính" },
  { id: "tai-khoan", label: "Tài khoản quản trị" },
  { id: "faq", label: "Câu hỏi thường gặp" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
      <Separator className="my-10" />
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/docs" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4.5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Tài liệu hệ thống</div>
              <div className="text-[11px] text-muted-foreground">
                Quản lý đặt vật tư công trình
              </div>
            </div>
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <LogIn className="size-4" /> Vào ứng dụng
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        {/* TOC */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">
            <DocsToc items={TOC} />
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {/* Hero */}
          <div className="mb-10">
            <Badge variant="secondary" className="mb-3">
              Tài liệu · v1.0
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Nền tảng quản lý đặt vật tư công trình
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              App dành cho nội bộ công ty: Bộ phận thi công tạo nhu cầu vật tư,
              Admin duyệt và quản lý dữ liệu, Kế toán theo dõi dự toán/thực tế.
              Nhà cung cấp không đăng nhập app; hệ thống chỉ lưu danh bạ/Zalo để
              gửi nội dung cần đặt.
            </p>
          </div>

          {/* Giới thiệu */}
          <Section id="gioi-thieu" title="Giới thiệu">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hệ thống giúp các bên trong một doanh nghiệp xây dựng phối hợp đặt
              và cung ứng vật tư theo từng công trình. Mỗi vai trò có bảng điều
              khiển và quyền riêng; toàn bộ thao tác được ghi lại làm nhật ký.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: PackagePlus,
                  title: "Đặt vật tư nhanh",
                  desc: "Tạo đơn nhiều dòng, tự gợi ý đơn giá từ dự toán.",
                },
                {
                  icon: Scale,
                  title: "Tự phân bổ & đối chiếu",
                  desc: "Duyệt đơn là số liệu tự cộng vào bảng thực tế, so với dự toán.",
                },
                {
                  icon: Wallet,
                  title: "Tổng hợp chi phí",
                  desc: "Theo dõi dự toán, thực tế và chênh lệch theo công trình.",
                },
              ].map((f) => (
                <Card key={f.title}>
                  <CardContent className="space-y-2 py-1">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <div className="font-medium">{f.title}</div>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>

          {/* Vai trò */}
          <Section id="vai-tro" title="Vai trò & phân quyền">
            <p className="text-sm text-muted-foreground">
              Hệ thống có 3 vai trò nội bộ chính. Nhà cung cấp là liên hệ bên
              ngoài, không có tài khoản đăng nhập app.
            </p>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Chức năng chính</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Badge>Quản trị (admin)</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Quản lý công trình, vật tư, dự toán, danh bạ đơn vị
                        cung cấp và thành viên; duyệt/từ chối đơn; xem toàn bộ.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge variant="secondary">Bộ phận thi công (site)</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Tạo đơn đặt vật tư; theo dõi đơn của mình; xem tổng hợp
                        công trình và gửi nội dung cần đặt qua Zalo khi đơn đã duyệt.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge variant="secondary">Kế toán (accountant)</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Xem đơn, báo cáo, đối chiếu dự toán/thực tế, tổng hợp
                        công trình và xuất CSV.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Nhà cung cấp</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Không đăng nhập app. Chỉ là danh bạ tên/số Zalo để nội
                        bộ liên hệ đặt vật tư.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Route được bảo vệ ở tầng proxy (chưa đăng nhập → chuyển về
                trang đăng nhập), và kiểm tra lại quyền theo vai trò trong từng
                trang.
              </span>
            </div>
          </Section>

          {/* Luồng nghiệp vụ */}
          <Section id="luong" title="Luồng nghiệp vụ">
            <p className="text-sm text-muted-foreground">
              Vòng đời một đơn đặt vật tư đi qua nội bộ công ty; Zalo chỉ là
              kênh liên hệ nhà cung cấp bên ngoài:
            </p>
            <div className="space-y-3">
              {[
                {
                  n: 1,
                  icon: PackagePlus,
                  role: "Bộ phận thi công",
                  title: "Tạo đơn",
                  desc: "Chọn công trình, thêm vật tư cần đặt và đơn vị cung cấp liên quan. Trạng thái: Chờ duyệt.",
                },
                {
                  n: 2,
                  icon: CheckSquare,
                  role: "Admin",
                  title: "Duyệt / Từ chối",
                  desc: "Xem chi tiết đơn và duyệt (hoặc từ chối kèm lý do). Khi duyệt, số lượng & tiền tự cộng dồn vào bảng tổng hợp thực tế của công trình.",
                },
                {
                  n: 3,
                  icon: Truck,
                  role: "Admin / Bộ phận thi công",
                  title: "Gửi Zalo",
                  desc: "Mở Zalo tới số liên hệ đã lưu; nội dung chỉ gồm mã đơn, công trình, vật tư, số lượng và đơn vị tính.",
                },
                {
                  n: 4,
                  icon: BarChart3,
                  role: "Kế toán / Admin",
                  title: "Đối chiếu & thống kê",
                  desc: "Đối chiếu dự toán vs thực tế, thống kê chi phí, tổng hợp công trình và xuất CSV.",
                },
              ].map((s) => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {s.n}
                    </div>
                    {s.n < 4 && <div className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <Card className="mb-1 flex-1">
                    <CardContent className="py-1">
                      <div className="flex items-center gap-2">
                        <s.icon className="size-4 text-primary" />
                        <span className="font-medium">{s.title}</span>
                        <Badge variant="outline">{s.role}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {s.desc}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </Section>

          {/* Tính năng */}
          <Section id="tinh-nang" title="Tính năng chính">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Boxes,
                  title: "Quản lý danh mục (admin)",
                  desc: "CRUD công trình, vật tư (đơn vị, nhóm) và dự toán theo công trình × vật tư.",
                },
                {
                  icon: Scale,
                  title: "Đối chiếu dự toán / thực tế",
                  desc: "Bảng theo công trình: SL & tiền dự toán vs thực tế, chênh lệch, % vượt — tô đỏ khi vượt hoặc phát sinh ngoài dự toán.",
                },
                {
                  icon: BarChart3,
                  title: "Thống kê & tổng hợp",
                  desc: "Lọc theo tháng/công trình, chi phí thực tế, cơ cấu theo nhóm, vật tư còn cần đặt và xuất CSV.",
                },
                {
                  icon: Bell,
                  title: "Thông báo in-app",
                  desc: "Chuông + popover xem nhanh, badge tự cập nhật, đánh dấu đã đọc từng cái hoặc tất cả.",
                },
                {
                  icon: History,
                  title: "Nhật ký & timeline",
                  desc: "Nhật ký toàn hệ thống (admin/giám đốc) và dòng thời gian diễn biến trên từng đơn.",
                },
                {
                  icon: Wallet,
                  title: "Danh bạ đơn vị cung cấp",
                  desc: "Lưu tên và số Zalo để liên hệ đặt vật tư; không tạo tài khoản đăng nhập cho nhà cung cấp.",
                },
              ].map((f) => (
                <Card key={f.title}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <f.icon className="size-4 text-primary" />
                      <CardTitle className="text-base">{f.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>

          {/* Tài khoản quản trị */}
          <Section id="tai-khoan" title="Tài khoản quản trị">
            <p className="text-sm text-muted-foreground">
              Không còn tài khoản demo trong hệ thống. Seed hiện tại chỉ đảm
              bảo email <code className="rounded bg-muted px-1.5 py-0.5 font-mono">nttantts@gmail.com</code> có quyền Admin.
            </p>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Vai trò</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        nttantts@gmail.com
                      </TableCell>
                      <TableCell>Quản trị</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Chạy <code className="rounded bg-muted px-1.5 py-0.5 font-mono">pnpm db:seed</code> để cập nhật quyền. Nếu tài khoản chưa có, có thể đặt biến <code className="rounded bg-muted px-1.5 py-0.5 font-mono">SEED_ADMIN_PASSWORD</code> để tạo mật khẩu tạm.
            </p>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Câu hỏi thường gặp">
            <div className="space-y-3">
              {[
                {
                  q: "Vì sao tôi không thấy mục thêm/sửa/xóa dữ liệu?",
                  a: "Quản lý danh mục (công trình, vật tư, dự toán) là quyền của vai trò Admin. Hãy liên hệ Admin để được cấp quyền phù hợp.",
                },
                {
                  q: "“Tự phân bổ” hoạt động thế nào?",
                  a: "Khi Admin duyệt đơn, trong cùng một giao dịch, số lượng và tiền của từng dòng được cộng dồn vào bảng tổng hợp thực tế của công trình — không cần nhập tay.",
                },
                {
                  q: "Nhà cung cấp có tài khoản trong app không?",
                  a: "Không. Nhà cung cấp chỉ là danh bạ liên hệ/Zalo để nội bộ gửi nội dung cần đặt.",
                },
                {
                  q: "Thông báo có gửi email/SMS không?",
                  a: "Hệ thống có thể gửi email bằng Resend nếu backend đã cấu hình RESEND_API_KEY; SMS không nằm trong phạm vi hiện tại.",
                },
              ].map((f) => (
                <Card key={f.q}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{f.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {f.a}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>

          <div className="flex items-center justify-between rounded-xl border bg-card p-5">
            <div>
              <div className="font-semibold">Sẵn sàng dùng thử?</div>
              <p className="text-sm text-muted-foreground">
                Đăng nhập bằng tài khoản nội bộ đã được Admin mời/cấp quyền.
              </p>
            </div>
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Vào ứng dụng <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

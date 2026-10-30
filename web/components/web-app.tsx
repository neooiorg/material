"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Clock3, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient, type AppUser, type Role } from "@/lib/auth";
import { api, jsonBody } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dashboard, Orders, OrderDetail, OrderCreate, Projects, ProjectDetail, Reconcile, Reports, Notifications, Activity } from "@/components/operations";
import { AdminCatalog, Budgets, Members } from "@/components/management";
import { Docs } from "@/components/docs";
import { Detail, type DetailResource } from "@/components/detail";
import { Receipts } from "@/components/receipts";
import { AppSidebar, nav } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message ?? "Email hoặc mật khẩu không đúng.");
      if ((result.data?.user as { role?: string } | undefined)?.role === "supplier") {
        await authClient.signOut();
        throw new Error("Tài khoản đơn vị cung cấp không sử dụng ứng dụng nội bộ.");
      }
      onLogin();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể đăng nhập."); }
    finally { setLoading(false); }
  }
  async function signInWithGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: window.location.origin });
      if (result.error) throw new Error(result.error.message ?? "Không thể đăng nhập với Google.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể mở đăng nhập Google."); setGoogleLoading(false); }
  }
  return <main className="flex min-h-svh items-center justify-center bg-muted/35 px-4 py-10 sm:py-16">
    <div className="w-full max-w-[520px]">
      <Card className="gap-0 py-0 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)]">
        <CardHeader className="items-center px-6 pb-8 pt-14 text-center sm:px-14 sm:pt-16">
          <div className="mb-6 flex size-12 items-center justify-center rounded-xl border bg-background shadow-sm">
            <BrandLogo className="h-8 w-auto" aria-hidden="true" />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-[-0.03em]">Đăng nhập</CardTitle>
          <p className="mt-2 text-base text-muted-foreground">Tiếp tục vào hệ thống quản lý vật tư.</p>
        </CardHeader>
        <CardContent className="px-6 pb-12 sm:px-14 sm:pb-14">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                className="h-10 px-3"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  className="h-10 px-3 pr-11"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button className="h-10 w-full" type="submit" disabled={loading || googleLoading}>
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <div className="my-7 flex items-center gap-4" aria-hidden="true">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">Hoặc tiếp tục với</span>
            <Separator className="flex-1" />
          </div>

          <Button className="h-10 w-full" type="button" variant="outline" disabled={loading || googleLoading} onClick={() => void signInWithGoogle()}>
            <GoogleMark />
            {googleLoading ? "Đang mở Google…" : "Google"}
          </Button>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Cần trợ giúp? <Link href="/docs" className="font-medium text-foreground underline-offset-4 hover:underline">Xem hướng dẫn sử dụng</Link>
      </p>
    </div>
  </main>;
}

type OwnAccessRequest = {
  id: string;
  requestedRole: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

function AccessGate({ user, onRefresh, onSignOut }: { user: AppUser; onRefresh: () => void; onSignOut: () => Promise<void> }) {
  const [request, setRequest] = useState<OwnAccessRequest | null | undefined>(undefined);
  const [requestedRole, setRequestedRole] = useState("site");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadRequest() {
    try { setRequest(await api<OwnAccessRequest | null>("/api/access-request/me")); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không tải được trạng thái yêu cầu."); setRequest(null); }
  }

  useEffect(() => { void loadRequest(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api<OwnAccessRequest>("/api/access-request", { method: "POST", ...jsonBody({ requestedRole, note }) });
      setRequest(result);
      toast.success("Đã gửi yêu cầu đến quản trị viên.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể gửi yêu cầu."); }
    finally { setSaving(false); }
  }

  const waiting = request?.status === "pending";
  const approved = request?.status === "approved";
  return <main className="flex min-h-svh items-center justify-center bg-muted/35 px-4 py-10">
    <div className="w-full max-w-lg">
      <Card className="gap-0 py-0 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)]">
        <CardHeader className="px-6 pb-6 pt-10 sm:px-10 sm:pt-12">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border bg-background shadow-sm">
            {waiting ? <Clock3 className="size-5 text-amber-600" aria-hidden="true" /> : <ShieldCheck className="size-5 text-indigo-600" aria-hidden="true" />}
          </div>
          <CardTitle className="text-2xl font-semibold tracking-[-0.025em]">{approved ? "Yêu cầu đã được duyệt" : waiting ? "Đang chờ phân quyền" : "Yêu cầu quyền truy cập"}</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {approved ? "Quyền mới đã sẵn sàng. Kiểm tra lại để mở hệ thống." : waiting ? "Quản trị viên đã nhận được yêu cầu. Sau khi được duyệt, bạn có thể vào hệ thống bằng tài khoản này." : "Tài khoản đã đăng nhập thành công nhưng chưa có vai trò trong hệ thống."}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-10 sm:px-10 sm:pb-12">
          <div className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="mt-0.5 break-all text-muted-foreground">{user.email}</p>
          </div>

          {request === undefined ? <div className="h-32 animate-pulse rounded-xl bg-muted" aria-label="Đang tải trạng thái yêu cầu" /> : waiting || approved ? <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              {request.status === "approved" ? "Yêu cầu đã được duyệt. Hãy kiểm tra lại quyền để mở hệ thống." : <>Vai trò đề xuất: <strong>{request.requestedRole === "accountant" ? "Kế toán" : "Bộ phận thi công"}</strong></>}
            </div>
            <Button className="w-full" onClick={onRefresh}>Kiểm tra quyền đã cấp</Button>
            <Button className="w-full" variant="outline" onClick={() => void onSignOut()}>Đăng xuất</Button>
          </div> : <form className="space-y-5" onSubmit={submit}>
            {request?.status === "rejected" && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Yêu cầu trước chưa được chấp thuận. Bạn có thể cập nhật thông tin và gửi lại.</p>}
            <div className="space-y-2">
              <Label htmlFor="requested-role">Vai trò đề xuất</Label>
              <Select value={requestedRole} onValueChange={(value) => setRequestedRole(value ?? "site")}>
                <SelectTrigger id="requested-role" className="w-full"><SelectValue>{requestedRole === "accountant" ? "Kế toán" : "Bộ phận thi công"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Bộ phận thi công</SelectItem>
                  <SelectItem value="accountant">Kế toán</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-note">Ghi chú cho Admin</Label>
              <Textarea id="access-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Ví dụ: Công trình hoặc bộ phận bạn đang phụ trách" />
            </div>
            <Button className="w-full" type="submit" disabled={saving}>{saving ? "Đang gửi…" : "Gửi yêu cầu phân quyền"}</Button>
            <Button className="w-full" type="button" variant="outline" onClick={() => void onSignOut()}>Đăng xuất</Button>
          </form>}
        </CardContent>
      </Card>
    </div>
  </main>;
}

function GoogleMark() {
  return <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.39a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.97-4.33 2.97-7.39Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z" />
    <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
  </svg>;
}

export function WebApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  async function loadUser() {
    setLoading(true);
    try { const result = await api<{ user: AppUser }>("/api/session"); setUser(result.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (pathname === "/docs") {
      setLoading(false);
      return;
    }
    void loadUser();
  }, [pathname]);
  if (pathname === "/docs") return <div className="mx-auto max-w-5xl p-4 py-10 md:p-8"><Docs/></div>;
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Đang mở hệ thống…</div>;
  if (!user) return <Login onLogin={loadUser}/>;
  if (user.role === "pending") return <AccessGate user={user} onRefresh={loadUser} onSignOut={async () => { await authClient.signOut(); setUser(null); router.push("/"); }}/>;
  const role = user.role;
  const current = nav.find((item) => item.href === pathname) ?? nav.find((item) => pathname.startsWith(item.href + "/") && item.href !== "/");
  return <SidebarProvider>
    <AppSidebar
      pathname={pathname}
      role={role}
      user={user}
      onSignOut={async () => { await authClient.signOut(); setUser(null); router.push("/"); }}
    />
    <SidebarInset className="min-w-0">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <span className="truncate text-sm font-medium">{current?.label ?? "Sổ Vật Tư"}</span>
        </div>
        <Link href="/notifications" className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:size-9" aria-label="Thông báo"><Bell className="size-5"/></Link>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-12 md:p-8">{renderPage(pathname, role)}</main>
    </SidebarInset>
  </SidebarProvider>;
}

function renderPage(pathname: string, role: Role) {
  const detailMatch = pathname.match(/^\/details\/(material|supplier-contact|activity|notification|budget)\/(\d+)$/);
  if (detailMatch) {
    const resource = detailMatch[1] as DetailResource;
    const allowed = resource === "material" || resource === "notification" || role === "admin";
    if (allowed) return <Detail resource={resource} id={Number(detailMatch[2])} role={role}/>;
  }
  if (pathname === "/") return <Dashboard role={role}/>;
  if (pathname === "/orders/new" && role !== "accountant") return <OrderCreate/>;
  if (pathname === "/orders") return <Orders canCreate={role !== "accountant"}/>;
  if (/^\/orders\/\d+$/.test(pathname)) return <OrderDetail id={Number(pathname.split("/")[2])} role={role}/>;
  if (pathname === "/approvals" && role === "admin") return <Orders approvals/>;
  if (pathname === "/receipts" && role !== "accountant") return <Receipts/>;
  if (pathname === "/projects") return <Projects/>;
  if (/^\/projects\/\d+$/.test(pathname)) return <ProjectDetail id={Number(pathname.split("/")[2])}/>;
  if (pathname === "/reconcile") return <Reconcile/>;
  if (pathname === "/reports" && role !== "site") return <Reports/>;
  if (pathname === "/notifications") return <Notifications/>;
  if (pathname === "/history" && role === "admin") return <Activity/>;
  if (pathname === "/admin/projects" && role === "admin") return <AdminCatalog kind="projects"/>;
  if (pathname === "/admin/materials" && role === "admin") return <AdminCatalog kind="materials"/>;
  if (pathname === "/admin/supplier-contacts" && role === "admin") return <AdminCatalog kind="supplier-contacts"/>;
  if (pathname === "/admin/budgets" && role === "admin") return <Budgets/>;
  if (pathname === "/admin/members" && role === "admin") return <Members/>;
  return <div><h1 className="text-xl font-semibold">Không tìm thấy trang</h1><Link href="/" className="mt-3 inline-block text-primary underline">Về tổng quan</Link></div>;
}

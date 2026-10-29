"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Building2 } from "lucide-react";
import { toast } from "sonner";
import { authClient, type AppUser, type Role } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Field } from "@/components/common";
import { Dashboard, Orders, OrderDetail, OrderCreate, Projects, ProjectDetail, Reconcile, Reports, Notifications, Activity } from "@/components/operations";
import { AdminCatalog, Budgets, Members } from "@/components/management";
import { Docs } from "@/components/docs";
import { Detail, type DetailResource } from "@/components/detail";
import { AppSidebar, nav } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  return <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4"><Card className="w-full max-w-md"><CardHeader><div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="size-6"/></div><CardTitle className="text-xl">Quản lý vật tư công trình</CardTitle><p className="text-sm text-muted-foreground">Đăng nhập bằng tài khoản nội bộ.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required/><Field label="Mật khẩu" type="password" value={password} onChange={setPassword} autoComplete="current-password" required/><Button className="w-full" type="submit" disabled={loading || googleLoading}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</Button></form><div className="my-4 flex items-center gap-3" aria-hidden="true"><Separator className="flex-1"/><span className="text-xs text-muted-foreground">hoặc</span><Separator className="flex-1"/></div><Button className="w-full" type="button" variant="outline" disabled={loading || googleLoading} onClick={() => void signInWithGoogle()}>{googleLoading ? "Đang mở Google…" : "Tiếp tục với Google"}</Button><Link href="/docs" className="mt-4 block text-center text-sm text-primary hover:underline">Xem tài liệu hệ thống</Link></CardContent></Card></div>;
}

export function WebApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  async function loadUser() {
    setLoading(true);
    try { const result = await api<{ user: AppUser }>("/api/session"); if (!(["admin", "site", "accountant"] as string[]).includes(result.user.role)) { setUser(null); return; } setUser(result.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadUser(); }, []);
  if (pathname === "/docs") return <div className="mx-auto max-w-5xl p-4 py-10 md:p-8"><Docs/></div>;
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Đang mở hệ thống…</div>;
  if (!user) return <Login onLogin={loadUser}/>;
  const role = user.role === "admin" || user.role === "site" || user.role === "accountant" ? user.role : "site";
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
          <span className="truncate text-sm font-medium">{current?.label ?? "Material"}</span>
        </div>
        <Link href="/notifications" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Thông báo"><Bell className="size-5"/></Link>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  PackageCheck,
  History,
  LayoutDashboard,
  LogOut,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import type { AppUser, Role } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";

export const nav = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard, roles: ["admin", "site", "accountant"], group: "Vận hành" },
  { href: "/orders", label: "Đơn đặt vật tư", icon: ClipboardList, roles: ["admin", "site", "accountant"], group: "Vận hành" },
  { href: "/approvals", label: "Duyệt đơn", icon: ClipboardCheck, roles: ["admin"], group: "Vận hành" },
  { href: "/receipts", label: "Xác nhận nhận hàng", icon: PackageCheck, roles: ["admin", "site"], group: "Vận hành" },
  { href: "/projects", label: "Tổng hợp công trình", icon: Building2, roles: ["admin", "site", "accountant"], group: "Vận hành" },
  { href: "/reconcile", label: "Đối chiếu", icon: Scale, roles: ["admin", "site", "accountant"], group: "Vận hành" },
  { href: "/reports", label: "Thống kê", icon: ChartNoAxesCombined, roles: ["admin", "accountant"], group: "Vận hành" },
  { href: "/admin/projects", label: "Quản lý công trình", icon: Building2, roles: ["admin"], group: "Quản trị" },
  { href: "/admin/materials", label: "Quản lý vật tư", icon: Boxes, roles: ["admin"], group: "Quản trị" },
  { href: "/admin/supplier-contacts", label: "Đơn vị cung cấp", icon: BookOpen, roles: ["admin"], group: "Quản trị" },
  { href: "/admin/budgets", label: "Dự toán", icon: Wallet, roles: ["admin"], group: "Quản trị" },
  { href: "/admin/members", label: "Thành viên", icon: Users, roles: ["admin"], group: "Quản trị" },
  { href: "/history", label: "Nhật ký", icon: History, roles: ["admin"], group: "Hệ thống" },
  { href: "/notifications", label: "Thông báo", icon: Bell, roles: ["admin", "site", "accountant"], group: "Hệ thống" },
  { href: "/docs", label: "Hướng dẫn", icon: BookOpen, roles: ["admin", "site", "accountant"], group: "Hệ thống" },
] as const;

const groups = ["Vận hành", "Quản trị", "Hệ thống"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MT";
}

export function AppSidebar({
  pathname,
  role,
  user,
  onSignOut,
}: {
  pathname: string;
  role: Role;
  user: AppUser;
  onSignOut: () => Promise<void>;
}) {
  const available = nav.filter((item) => (item.roles as readonly Role[]).includes(role));
  const { isMobile } = useSidebar();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  const profileButton = <>
    <Avatar>
      <AvatarFallback>{initials(user.name)}</AvatarFallback>
    </Avatar>
    <span className="grid min-w-0 flex-1 text-left leading-tight">
      <span className="truncate text-sm font-medium">{user.name}</span>
      <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
    </span>
    <ChevronUp className={`ml-auto size-4 opacity-60 transition-transform ${mobileProfileOpen ? "rotate-180" : ""}`} aria-hidden="true" />
  </>;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" aria-label="Sổ Vật Tư — Quản lý vật tư công trình" />}
              tooltip="Sổ Vật Tư"
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <BrandLogo className="h-8 w-auto" aria-hidden="true" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">Sổ Vật Tư</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Quản lý vật tư</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent role="navigation" aria-label="Điều hướng chính">
        {groups.map((group) => {
          const items = available.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            {isMobile ? <div className="space-y-1">
              {mobileProfileOpen ? <div id="mobile-profile-actions" className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-2" role="region" aria-label="Tùy chọn tài khoản">
                <div className="min-w-0 px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-sm text-destructive outline-none transition-colors active:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  onClick={() => void onSignOut()}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              </div> : null}
              <SidebarMenuButton
                size="lg"
                aria-expanded={mobileProfileOpen}
                aria-controls="mobile-profile-actions"
                className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
                onClick={() => setMobileProfileOpen((open) => !open)}
              >
                {profileButton}
              </SidebarMenuButton>
            </div> : <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
                  />
                }
              >
                {profileButton}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="min-w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => void onSignOut()}>
                    <LogOut aria-hidden="true" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

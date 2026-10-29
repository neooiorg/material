"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";
import {
  LayoutDashboard,
  PackagePlus,
  ClipboardList,
  CheckSquare,
  Truck,
  Scale,
  BarChart3,
  Building2,
  Boxes,
  Wallet,
  Bell,
  History,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

function getNavItems(role: UserRole): NavItem[] {
  const dashboard: NavItem = {
    href: "/",
    label: "Tổng quan",
    icon: LayoutDashboard,
    exact: true,
  };
  const notifications: NavItem = {
    href: "/notifications",
    label: "Thông báo",
    icon: Bell,
  };

  switch (role) {
    case "admin":
      return [
        dashboard,
        { href: "/admin/projects", label: "Công trình", icon: Building2 },
        { href: "/admin/materials", label: "Vật tư", icon: Boxes },
        { href: "/admin/budgets", label: "Dự toán", icon: Wallet },
        { href: "/orders", label: "Đơn đặt", icon: ClipboardList },
        { href: "/reconcile", label: "Đối chiếu", icon: Scale },
        { href: "/reports", label: "Thống kê", icon: BarChart3 },
        { href: "/history", label: "Nhật ký", icon: History },
        notifications,
      ];
    case "director":
      return [
        dashboard,
        { href: "/approvals", label: "Duyệt đơn", icon: CheckSquare },
        { href: "/orders", label: "Đơn đặt", icon: ClipboardList },
        { href: "/reconcile", label: "Đối chiếu", icon: Scale },
        { href: "/reports", label: "Thống kê", icon: BarChart3 },
        { href: "/history", label: "Nhật ký", icon: History },
        notifications,
      ];
    case "site":
      return [
        dashboard,
        { href: "/orders/new", label: "Đặt vật tư", icon: PackagePlus },
        { href: "/orders", label: "Đơn của tôi", icon: ClipboardList },
        { href: "/reconcile", label: "Đối chiếu", icon: Scale },
        notifications,
      ];
    case "supplier":
      return [
        dashboard,
        { href: "/delivery", label: "Đơn cần giao", icon: Truck },
        { href: "/orders", label: "Đơn đặt", icon: ClipboardList },
        { href: "/reports", label: "Công nợ", icon: Wallet },
        notifications,
      ];
    default:
      return [dashboard, notifications];
  }
}

export function AppSidebar({
  role,
  collapsed = false,
  onNavigate,
}: {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.label}
            className={cn(
              "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

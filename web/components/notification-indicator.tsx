"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useApi } from "@/components/common";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/components/notification-sync";

export function NotificationIndicator() {
  const query = useApi<{ unreadCount: number }>("/api/notifications/recent");
  useEffect(() => {
    const timer = window.setInterval(query.refresh, 60_000);
    window.addEventListener("focus", query.refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, query.refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", query.refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, query.refresh);
    };
  }, [query.refresh]);
  const count = query.data?.unreadCount ?? 0;
  return <Link href="/notifications" className="relative flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:size-9" aria-label={count ? `${count} thông báo chưa đọc` : "Thông báo"}>
    <Bell className="size-5"/>
    {count > 0 ? <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground tabular-nums">{count > 99 ? "99+" : count}</span> : null}
  </Link>;
}

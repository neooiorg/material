"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useApi } from "@/components/common";

export function NotificationIndicator() {
  const query = useApi<{ unreadCount: number }>("/api/notifications/recent");
  useEffect(() => {
    const timer = window.setInterval(query.refresh, 30_000);
    window.addEventListener("focus", query.refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", query.refresh); };
  }, [query.refresh]);
  const count = query.data?.unreadCount ?? 0;
  return <Link href="/notifications" className="relative flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:size-9" aria-label={count ? `${count} thông báo chưa đọc` : "Thông báo"}>
    <Bell className="size-5"/>
    {count > 0 ? <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white md:-right-0.5 md:-top-0.5">{count > 99 ? "99+" : count}</span> : null}
  </Link>;
}

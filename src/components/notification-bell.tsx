"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationsReadByIds,
} from "@/lib/actions/orders";
import { Bell, Check, CheckCheck } from "lucide-react";

export type NotiItem = {
  id: number;
  title: string;
  message: string;
  orderId: number | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({
  initialUnread,
  initialRecent,
}: {
  initialUnread: number;
  initialRecent: NotiItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [recent, setRecent] = useState<NotiItem[]>(initialRecent);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unreadCount ?? 0);
      setRecent(data.recent ?? []);
    } catch {
      /* im lặng khi offline */
    }
  }, []);

  // Polling ~30s + refetch khi cửa sổ được focus
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function handleItemClick(n: NotiItem) {
    setOpen(false);
    if (!n.isRead) {
      setUnread((u) => Math.max(0, u - 1));
      setRecent((list) =>
        list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      await markNotificationsReadByIds([n.id]);
    }
    router.push(n.orderId ? `/orders/${n.orderId}` : "/notifications");
    router.refresh();
  }

  async function handleMarkAll() {
    setUnread(0);
    setRecent((list) => list.map((x) => ({ ...x, isRead: true })));
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px] tabular-nums">
                {unread > 9 ? "9+" : unread}
              </Badge>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Thông báo</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Đánh dấu tất cả
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo.
            </p>
          ) : (
            recent.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                title={`${n.title}\n${n.message}`}
                className={cn(
                  "flex w-full items-start gap-2 border-b px-3 py-2.5 text-left transition-colors hover:bg-accent last:border-0",
                  !n.isRead && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    n.isRead
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/15 text-primary"
                  )}
                >
                  {n.isRead ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Bell className="size-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate text-sm font-medium" title={n.title}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground" title={n.message}>
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t p-1.5">
          <Button
            variant="ghost"
            className="w-full"
            size="sm"
            onClick={() => setOpen(false)}
            render={<Link href="/notifications">Xem tất cả</Link>}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

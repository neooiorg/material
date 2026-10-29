import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Badge, IconButton } from "@/components/ui";
import { api } from "@/lib/api";

export function HeaderActions() {
  const pathname = usePathname();
  const pending = useRef<{ target: string; at: number } | null>(null);
  const [unread, setUnread] = useState(0);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    async function refresh() {
      try {
        const value = await api<{ unreadCount: number }>("/api/notifications/recent");
        setUnread(value.unreadCount);
      } catch {
        // Keep navigation usable when notifications cannot be fetched.
      }
    }

    void refresh();
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // The header instance may survive a stack transition. Unlock it as soon
    // as the destination route is active so Back works normally.
    setNavigating(false);
  }, [pathname]);

  function open(target: "/menu" | "/notifications") {
    if (pathname === target || pathname.endsWith(target) || navigating) return;
    if (pending.current?.target === target && Date.now() - pending.current.at < 1_000) return;
    pending.current = { target, at: Date.now() };
    setNavigating(true);
    router.navigate(target, { dangerouslySingular: true });
  }

  return <View style={{ flexDirection: "row" }}>
    {pathname !== "/notifications" ? <View>
      <IconButton icon="bell-outline" disabled={navigating} onPress={() => open("/notifications")} />
      {unread > 0 && <Badge style={{ position: "absolute", right: 2, top: 2 }}>{unread > 9 ? "9+" : unread}</Badge>}
    </View> : null}
    {pathname !== "/menu" && !pathname.endsWith("/menu") ? <IconButton icon="menu" disabled={navigating} onPress={() => open("/menu")} /> : null}
  </View>;
}

import { useEffect, useRef, useState } from "react";
import { router, Stack } from "expo-router";
import { List, Button, Divider, Text } from "@/components/ui";
import { Screen } from "@/components/screen";
import { authClient, type AppUser } from "@/lib/auth-client";
import { roleLabels } from "@/lib/format";
import { AppUpdateButton } from "@/components/app-update";
import { colors } from "@/theme";
const common = [{ href: "/", label: "Tổng quan", icon: "view-dashboard-outline" }, { href: "/orders", label: "Đơn đặt", icon: "clipboard-list-outline" }, { href: "/notifications", label: "Thông báo", icon: "bell-outline" }];
const byRole = {
  admin: [{ href: "/approvals", label: "Duyệt đơn", icon: "check-decagram-outline" }, { href: "/admin/projects", label: "Công trình", icon: "office-building" }, { href: "/admin/materials", label: "Vật tư", icon: "package-variant" }, { href: "/admin/budgets", label: "Dự toán", icon: "wallet-outline" }, { href: "/admin/members", label: "Thành viên", icon: "account-group" }, { href: "/reconcile", label: "Đối chiếu", icon: "scale-balance" }, { href: "/reports", label: "Thống kê", icon: "chart-bar" }, { href: "/history", label: "Nhật ký", icon: "history" }],
  site: [{ href: "/orders/new", label: "Đặt vật tư", icon: "plus-box-outline" }, { href: "/reconcile", label: "Đối chiếu", icon: "scale-balance" }],
  accountant: [{ href: "/reconcile", label: "Đối chiếu", icon: "scale-balance" }, { href: "/reports", label: "Thống kê", icon: "chart-bar" }],
} as const;
export default function MenuScreen() {
  const session = authClient.useSession();
  const user = session.data?.user as AppUser | undefined;
  const pending = useRef<{ href: string; at: number } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigationReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (navigationReset.current) clearTimeout(navigationReset.current);
  }, []);
  if (!user) return null;

  const summary = [{ href: "/projects", label: "Tổng hợp công trình", icon: "office-building" }];
  const items = [common[0], ...summary, ...byRole[user.role], ...common.slice(1)];

  function open(href: string) {
    if (navigating || (pending.current?.href === href && Date.now() - pending.current.at < 1_000)) return;
    pending.current = { href, at: Date.now() };
    setNavigating(true);
    router.navigate(href as never, { dangerouslySingular: true });
    // A failed navigation should not leave the screen permanently disabled.
    navigationReset.current = setTimeout(() => setNavigating(false), 1_500);
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return <Screen>
    <Stack.Screen options={{ title: "Menu" }} />
    <Text selectable variant="titleMedium">{user.name}</Text>
    <Text selectable>{user.email} · {roleLabels[user.role]}</Text>
    <Divider />
    {items.map((item) => <List.Item key={item.href} title={item.label} disabled={navigating || loggingOut} left={() => <List.Icon icon={item.icon as any} />} onPress={() => open(item.href)} />)}
    <AppUpdateButton />
    <Button mode="outlined" textColor={colors.danger} icon="logout" loading={loggingOut} disabled={loggingOut} onPress={() => { void logout(); }}>Đăng xuất</Button>
  </Screen>;
}

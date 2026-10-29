import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BounceIn } from "react-native-animation-kit";
import { ActivityIndicator, Button, Card, Text } from "@/components/ui";
import { AppIcon } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export function Screen({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return <ScrollView
    contentInsetAdjustmentBehavior="automatic"
    keyboardShouldPersistTaps="always"
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl + Math.max(insets.bottom, spacing.md), gap: spacing.lg }}
  >{children}</ScrollView>;
}

export function StateView({ loading, error, retry, children }: PropsWithChildren<{ loading: boolean; error?: string; retry?: () => void }>) {
  if (loading) return <Card mode="contained" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Card.Content style={{ paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.md }}>
      <ActivityIndicator />
      <View style={{ gap: spacing.xs, alignItems: "center" }}>
        <Text selectable={false} variant="labelMedium">Đang tải dữ liệu</Text>
        <Text selectable={false} style={{ color: colors.textMuted, textAlign: "center" }}>Vui lòng chờ trong giây lát…</Text>
      </View>
    </Card.Content>
  </Card>;
  if (error) return <Card mode="contained" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Card.Content style={{ paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: "center" }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dangerContainer, alignItems: "center", justifyContent: "center" }}><AppIcon name="x" color={colors.danger} size={26} /></View>
      <View style={{ gap: spacing.xs, alignItems: "center" }}>
        <Text selectable={false} variant="titleMedium">Không tải được dữ liệu</Text>
        <Text selectable style={{ textAlign: "center", color: colors.textSecondary }}>{error}</Text>
      </View>
      {retry && <Button mode="contained" onPress={retry}>Thử lại</Button>}
    </Card.Content>
  </Card>;
  return <>{children}</>;
}

export function Empty({ children }: PropsWithChildren) {
  return <Card mode="contained" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Card.Content style={{ paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
      <BounceIn friction={8} tension={70}><View accessible accessibilityLabel="Chưa có dữ liệu" style={{ width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Text selectable={false} style={{ fontSize: 25, lineHeight: 30 }}>📋</Text></View></BounceIn>
      <Text selectable style={{ textAlign: "center", color: colors.textMuted }}>{children}</Text>
    </Card.Content>
  </Card>;
}

export function InlineEmpty({ children, icon = "📋" }: PropsWithChildren<{ icon?: string }>) {
  return <View style={{ paddingVertical: spacing.lg, alignItems: "center", gap: spacing.sm }}>
    <View accessible accessibilityLabel="Chưa có dữ liệu" style={{ width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
      <Text selectable={false} style={{ fontSize: 21, lineHeight: 26 }}>{icon}</Text>
    </View>
    <Text selectable style={{ textAlign: "center", color: colors.textMuted }}>{children}</Text>
  </View>;
}

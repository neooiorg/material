import { useEffect, useState } from "react";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator } from "@/components/ui";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient, clearAuthNavigationPending, isAuthNavigationPending } from "@/lib/auth-client";
import { HeaderActions } from "@/components/header-actions";
import { colors, fonts } from "@/theme";

export default function ProtectedLayout() {
  const session = authClient.useSession();
  const insets = useSafeAreaInsets();
  const [waitingForNewSession, setWaitingForNewSession] = useState(() => isAuthNavigationPending());

  useEffect(() => {
    if (session.data?.user) {
      clearAuthNavigationPending();
      setWaitingForNewSession(false);
      return;
    }
    if (!isAuthNavigationPending()) {
      setWaitingForNewSession(false);
      return;
    }
    setWaitingForNewSession(true);
    void session.refetch?.();
    const timer = setTimeout(() => {
      setWaitingForNewSession(isAuthNavigationPending());
      void session.refetch?.();
    }, 450);
    return () => clearTimeout(timer);
  }, [session]);

  if (session.isPending || waitingForNewSession) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 24,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }
  if (!session.data?.user) return <Redirect href="/login" />;
  return <Stack screenOptions={{
    headerRight: () => <HeaderActions />,
    headerBackButtonDisplayMode: "minimal",
    headerTitleStyle: { fontFamily: fonts.semibold },
    headerTintColor: colors.primary,
    contentStyle: { backgroundColor: colors.background },
  }} />;
}

import "react-native-gesture-handler";
import "../global.css";
import { Appearance } from "react-native";
import { useFonts } from "@expo-google-fonts/manrope/useFonts";
import { Stack } from "expo-router";
import { HeroUINativeProvider, type HeroUINativeConfig } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { SnackbarProvider } from "@/components/snackbar";
import { colors, fonts } from "@/theme";

// Khoá giao diện sáng để đồng bộ với design token (light-only). / Lock light scheme.
// setColorScheme chỉ có trên native (RN >= 0.72); web không có nên bọc guard.
if (typeof Appearance.setColorScheme === "function") Appearance.setColorScheme("light");

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_400Regular: require("@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf"),
    Manrope_500Medium: require("@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf"),
    Manrope_600SemiBold: require("@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf"),
    Manrope_700Bold: require("@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf"),
  });
  if (!loaded) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><AppShell /></SafeAreaProvider></GestureHandlerRootView>;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const heroConfig: HeroUINativeConfig = {
    textProps: { maxFontSizeMultiplier: 1.5 },
    textInputProps: { maxFontSizeMultiplier: 1.5 },
    toast: {
      defaultProps: { placement: "bottom", isSwipeable: true },
      insets: { top: Math.max(insets.top, 12), bottom: Math.max(insets.bottom, 12) + 16, left: 16, right: 16 },
      maxVisibleToasts: 1,
    },
  };
  return <HeroUINativeProvider config={heroConfig}><SnackbarProvider><Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerTitleStyle: { fontFamily: fonts.semibold }, headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(protected)" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ title: "Đăng nhập", headerShown: false }} /><Stack.Screen name="docs" options={{ title: "Tài liệu hệ thống" }} /></Stack></SnackbarProvider></HeroUINativeProvider>;
}

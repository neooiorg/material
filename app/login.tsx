import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, View } from "react-native";
import { Link, router } from "expo-router";
import { Button, Card, Text, TextInput } from "@/components/ui";
import { authClient, markAuthNavigationPending } from "@/lib/auth-client";
import { Screen } from "@/components/screen";
import { useNotice } from "@/components/snackbar";
import { colors } from "@/theme";

export default function Login() {
  const notice = useNotice();
  const session = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // A stale Login route can still be restored by Android's Back stack after
  // sign-in. Session state is the source of truth: whenever this screen is
  // reached with a valid session, replace it rather than showing Login again.
  useEffect(() => {
    if (session.data?.user) router.replace("/");
  }, [session.data?.user]);

  if (session.data?.user) return null;

  async function rejectSupplierAccount(user: unknown) {
    if ((user as { role?: string } | undefined)?.role !== "supplier") return false;
    await authClient.signOut();
    notice("Tài khoản Cửa hàng không sử dụng ứng dụng nội bộ này.");
    return true;
  }

  async function submit() {
    if (loading) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      notice("Nhập email và mật khẩu để tiếp tục.");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });
      if (result.error) {
        notice(result.error.message || "Email hoặc mật khẩu không đúng.");
        return;
      }
      if (await rejectSupplierAccount(result.data?.user)) return;
      // `signIn.email` has already created the session. Calling `getSession`
      // immediately afterwards can return the client's previous cached empty
      // state on web, which incorrectly asks the user to sign in a second time.
      // The protected layout observes the auth store and completes its own
      // session refresh after navigation.
      markAuthNavigationPending();
      router.replace("/");
    } catch {
      notice("Không thể kết nối máy chủ. Kiểm tra Internet rồi thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error) {
        const message = result.error.message || "Không thể đăng nhập với Google.";
        notice(message.toLowerCase().includes("provider")
          ? "Google OAuth chưa sẵn sàng trên backend. Hãy deploy/rebuild lại material-api sau khi thêm env."
          : message);
        return;
      }
      markAuthNavigationPending(8000);
      router.replace("/");
    } catch {
      notice("Không thể mở đăng nhập Google. Kiểm tra cấu hình Google OAuth rồi thử lại.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}><Screen>
    <View style={{ paddingTop: 40, paddingBottom: 12, gap: 14 }}>
      <Image source={require("../assets/images/app-icon.png")} accessibilityLabel="Biểu tượng Quản lý đặt vật tư" style={{ width: 58, height: 58, borderRadius: 18 }} />
      <Text variant="headlineMedium">Vật tư, đúng lúc.</Text>
      <Text style={{ color: colors.textSecondary, maxWidth: 310 }}>Theo dõi đơn hàng, giao nhận và ngân sách công trình trong một nơi.</Text>
    </View>
    <Card style={{ gap: 18 }}><View style={{ gap: 4 }}><Text variant="titleLarge">Đăng nhập</Text><Text style={{ color: colors.textSecondary }}>Sử dụng tài khoản nội bộ đã được cấp hoặc được Admin mời.</Text></View><TextInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} /><TextInput label="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} /><Button mode="contained" loading={loading} disabled={loading || googleLoading} onPress={() => { void submit(); }}>Đăng nhập</Button><Button mode="outlined" icon="google" loading={googleLoading} disabled={loading || googleLoading} onPress={() => { void signInWithGoogle(); }}>Đăng nhập với Google</Button></Card>
    <Link href="/docs" asChild><Button mode="text">Xem tài liệu hệ thống</Button></Link>
  </Screen></KeyboardAvoidingView>;
}

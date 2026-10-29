import { useMemo, useState } from "react";
import { View } from "react-native";
import * as Updates from "expo-updates";
import { Button, Text } from "@/components/ui";
import { useNotice } from "@/components/snackbar";
import { colors, radius } from "@/theme";

export function AppUpdateButton() {
  const notice = useNotice();
  const [checking, setChecking] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const updateState = Updates.useUpdates();
  const busy = checking || restarting || updateState.isChecking || updateState.isDownloading || updateState.isRestarting;
  const status = useMemo(() => {
    if (restarting || updateState.isRestarting) return "Đang áp dụng bản cập nhật và khởi động lại…";
    if (updateState.isDownloading) {
      const progress = typeof updateState.downloadProgress === "number"
        ? ` ${Math.round(updateState.downloadProgress * 100)}%`
        : "";
      return `Đang tải bản cập nhật${progress}…`;
    }
    if (checking || updateState.isChecking) return "Đang kiểm tra bản cập nhật…";
    return null;
  }, [checking, restarting, updateState.downloadProgress, updateState.isChecking, updateState.isDownloading, updateState.isRestarting]);

  async function checkForUpdate() {
    if (!Updates.isEnabled) {
      notice("Cập nhật trong app sẽ hoạt động sau khi cài APK phát hành mới.");
      return;
    }

    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        notice("Bạn đang dùng phiên bản mới nhất.");
        return;
      }

      const downloaded = await Updates.fetchUpdateAsync();
      if (!downloaded.isNew) {
        notice("Không thể tải bản cập nhật. Vui lòng thử lại sau.");
        return;
      }

      notice("Đã tải bản mới. Ứng dụng đang khởi động lại…");
      setRestarting(true);
      await Updates.reloadAsync();
    } catch (error) {
      notice(error instanceof Error ? error.message : "Không thể kiểm tra cập nhật.");
    } finally {
      setChecking(false);
    }
  }

  return <View style={{ gap: 8 }}>
    <Button mode="outlined" icon="download" loading={busy} disabled={busy} onPress={checkForUpdate}>Kiểm tra cập nhật</Button>
    {status ? <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 10, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radius.md, backgroundColor: colors.primaryContainer }}>
      <Text selectable={false} variant="labelMedium" style={{ color: colors.primary }}>{status}</Text>
      {updateState.isDownloading && typeof updateState.downloadProgress === "number" ? <View style={{ height: 4, borderRadius: radius.full, overflow: "hidden", backgroundColor: colors.track }}>
        <View style={{ height: "100%", width: `${Math.max(2, Math.round(updateState.downloadProgress * 100))}%`, borderRadius: radius.full, backgroundColor: colors.primary }} />
      </View> : null}
    </View> : null}
  </View>;
}

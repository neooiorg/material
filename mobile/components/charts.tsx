import { View } from "react-native";
// Import từ subpath để tránh barrel kéo theo module gradient (không có bản web).
// Native (Android/iOS) vẫn resolve bình thường; PieChart chỉ cần react-native-svg.
import { PieChart } from "react-native-gifted-charts/dist/PieChart";
import { Text, TruncatedText } from "@/components/ui";
import { InlineEmpty } from "@/components/screen";
import { formatVND } from "@/lib/format";
import { chartPalette, colors, fonts } from "@/theme";

const palette = chartPalette;

/** Biểu đồ thanh ngang có nhãn / Labeled horizontal bar list. */
export function BarChart({ data, money = false }: { data: { name: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <View style={{ gap: 14 }}>
    {data.map((item, index) => {
      const width = `${Math.max(3, Math.round(item.value / max * 100))}%` as const;
      return <View key={item.name} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <TruncatedText title="Tên mục" variant="labelMedium" style={{ flex: 1 }}>{item.name}</TruncatedText>
          <TruncatedText title="Giá trị" variant="labelMedium" style={{ maxWidth: 150, textAlign: "right" }}>{money ? formatVND(item.value) : item.value}</TruncatedText>
        </View>
        <View style={{ height: 10, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}><View style={{ width, height: "100%", borderRadius: 99, backgroundColor: palette[index % palette.length] }} /></View>
      </View>;
    })}
  </View>;
}

/** Danh sách có chú giải + thanh tỉ lệ / Legend list with proportion bars. */
export function LegendChart({ data }: { data: { name: string; value: number }[] }) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  return <View style={{ gap: 12 }}>
    {data.map((item, index) => <View key={item.name} style={{ gap: 5 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette[index % palette.length] }} /><TruncatedText title="Tên mục" style={{ flex: 1 }}>{item.name}</TruncatedText><TruncatedText title="Giá trị" variant="labelMedium" style={{ maxWidth: 150, textAlign: "right" }}>{formatVND(item.value)}</TruncatedText></View><View style={{ marginLeft: 18, height: 5, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}><View style={{ width: `${Math.max(2, Math.round(item.value / total * 100))}%`, height: "100%", backgroundColor: palette[index % palette.length] }} /></View></View>)}
  </View>;
}

/** Thanh tiến độ đơn / Single progress bar (giá trị / tổng). */
export function ProgressBar({ value, total, tint = colors.primary, label }: { value: number; total: number; tint?: string; label?: string }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return <View style={{ gap: 6 }}>
    {label ? <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><TruncatedText title="Nhãn tiến độ" variant="labelMedium" style={{ flex: 1 }}>{label}</TruncatedText><Text variant="labelMedium" style={{ color: tint }}>{Math.round(ratio * 100)}%</Text></View> : null}
    <View style={{ height: 10, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}><View style={{ width: `${Math.max(2, Math.round(ratio * 100))}%`, height: "100%", borderRadius: 99, backgroundColor: tint }} /></View>
  </View>;
}

/** Biểu đồ thanh nhóm: dự toán vs thực tế / Grouped bars (budget vs actual). */
export function GroupedBarChart({ data, money = false }: { data: { name: string; budget: number; actual: number }[]; money?: boolean }) {
  const max = Math.max(1, ...data.map((item) => Math.max(item.budget, item.actual)));
  const fmt = (value: number) => (money ? formatVND(value) : String(value));
  const bar = (value: number, color: string) => <View style={{ gap: 4 }}><View style={{ height: 9, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}><View style={{ width: `${Math.max(2, Math.round(value / max * 100))}%`, height: "100%", borderRadius: 99, backgroundColor: color }} /></View></View>;
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: "row", gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.info }} /><Text variant="labelMedium">Dự toán</Text></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /><Text variant="labelMedium">Thực tế</Text></View>
    </View>
    {data.map((item) => {
      const over = item.actual > item.budget && item.actual > 0;
      return <View key={item.name} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <TruncatedText title="Vật tư" variant="labelMedium" style={{ flex: 1 }}>{item.name}</TruncatedText>
          <TruncatedText title="Thực tế / dự toán" variant="labelSmall" style={{ color: over ? colors.danger : colors.textSecondary, maxWidth: 160, textAlign: "right" }}>{fmt(item.actual)} / {fmt(item.budget)}</TruncatedText>
        </View>
        {bar(item.budget, colors.info)}
        {bar(item.actual, over ? colors.danger : colors.primary)}
      </View>;
    })}
  </View>;
}

/** Biểu đồ vành khuyên + chú giải / Donut chart with legend.
 *  Đọc trực tiếp dữ liệu thật {name, value}[]; `money` để định dạng tiền tệ. */
export function DonutChart({ data, money = false, centerLabel = "Tổng" }: { data: { name: string; value: number }[]; money?: boolean; centerLabel?: string }) {
  const positive = data.filter((item) => item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (positive.length === 0 || total === 0) return <InlineEmpty icon="📊">Chưa có dữ liệu biểu đồ.</InlineEmpty>;
  const pieData = positive.map((item, index) => ({ value: item.value, color: palette[index % palette.length] }));
  const formatValue = (value: number) => (money ? formatVND(value) : String(value));
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
    <PieChart
      donut
      data={pieData}
      radius={68}
      innerRadius={44}
      innerCircleColor={colors.surface}
      centerLabelComponent={() => <View style={{ alignItems: "center" }}>
        <Text selectable={false} variant="titleMedium" style={{ color: colors.text }}>{money ? formatVND(total) : total}</Text>
        <Text selectable={false} style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 }}>{centerLabel}</Text>
      </View>}
    />
    <View style={{ flex: 1, minWidth: 140, gap: 8 }}>
      {positive.map((item, index) => <View key={item.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette[index % palette.length] }} />
        <TruncatedText title="Tên mục" style={{ flex: 1 }}>{item.name}</TruncatedText>
        <TruncatedText title="Giá trị" variant="labelMedium" style={{ maxWidth: 120, textAlign: "right" }}>{formatValue(item.value)}</TruncatedText>
      </View>)}
    </View>
  </View>;
}

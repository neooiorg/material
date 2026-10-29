import { useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { View } from "react-native";
import { Button, Text } from "@/components/ui";
import { colors } from "@/theme";

type MonthPickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

function monthDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return Number.isInteger(year) && Number.isInteger(month) ? new Date(year, month - 1, 1) : new Date();
}

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthPicker({ label = "Tháng", value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => monthDate(value), [value]);
  const isIos = process.env.EXPO_OS === "ios";

  function selectMonth(event: DateTimePickerEvent, selected?: Date) {
    if (!isIos) setOpen(false);
    if (event.type === "dismissed" || !selected) return;
    onChange(toMonthValue(selected));
  }

  return <View style={{ gap: 6 }}>
    <Text variant="labelMedium" style={{ color: colors.label }}>{label}</Text>
    <Button mode="outlined" icon="calendar" onPress={() => setOpen((shown) => !shown)}>{`Tháng ${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`}</Button>
    {open ? <DateTimePicker value={date} mode="date" display={isIos ? "inline" : "default"} onChange={selectMonth} /> : null}
  </View>;
}

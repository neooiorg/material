import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, Text } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/theme";

type SelectOption = { value: string; label: string };

type SelectMenuProps = {
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: string;
};

/**
 * Select dùng Modal + FlatList để tránh xung đột gesture giữa Dialog,
 * ScrollView của màn hình và từng option trên Android. FlatList chỉ dựng các
 * hàng đang nhìn thấy nên các danh sách vật tư/công trình dài vẫn phản hồi nhanh.
 */
export const SelectMenu = memo(function SelectMenu({
  value,
  options,
  onChange,
  label = "Chọn",
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const opening = useRef(false);
  const selecting = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const close = useCallback(() => {
    opening.current = false;
    setOpen(false);
  }, []);
  const select = useCallback(
    (option: SelectOption) => {
      if (selecting.current) return;
      selecting.current = true;
      setOpen(false);
      opening.current = false;
      // Let the modal release the current touch before the controlled value
      // re-renders. This prevents an option tap from being passed to the
      // control underneath it on Android.
      requestAnimationFrame(() => {
        onChange(option.value);
        selecting.current = false;
      });
    },
    [onChange],
  );
  const renderItem = useCallback<ListRenderItem<SelectOption>>(
    ({ item }) => (
      <OptionRow
        option={item}
        selected={item.value === value}
        onSelect={select}
      />
    ),
    [select, value],
  );

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="labelMedium" style={{ color: colors.label }}>
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "Chưa chọn"}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (open || opening.current || selecting.current) return;
          opening.current = true;
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderWidth: 1,
          borderColor: pressed ? colors.primary : colors.border,
          borderRadius: radius.md,
          borderCurve: "continuous",
          backgroundColor: pressed ? colors.primaryContainer : colors.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        })}
      >
        <Text
          selectable={false}
          numberOfLines={2}
          style={{
            flex: 1,
            color: selected ? colors.text : colors.textSecondary,
            fontFamily: fonts.medium,
          }}
        >
          {selected?.label ?? label}
        </Text>
        <AppIcon name="chevron-down" color={colors.textSecondary} size={18} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        hardwareAccelerated
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng danh sách lựa chọn"
            onPress={close}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(15, 23, 42, 0.42)",
            }}
          />

          <View
            style={{
              maxHeight: Math.min(height * 0.72, 560),
              overflow: "hidden",
              borderRadius: radius.lg,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
            }}
          >
            <View
              style={{
                minHeight: 56,
                paddingLeft: spacing.lg,
                paddingRight: spacing.sm,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text selectable={false} variant="titleMedium" style={{ flex: 1 }}>
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={8}
                onPress={close}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? colors.surfaceMuted : "transparent",
                })}
              >
                <AppIcon name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              extraData={value}
              renderItem={renderItem}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              keyboardShouldPersistTaps="always"
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={16}
              windowSize={5}
              removeClippedSubviews={false}
              contentContainerStyle={{ padding: spacing.sm }}
              ListEmptyComponent={
                <Text
                  selectable={false}
                  style={{
                    padding: spacing.lg,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Không có lựa chọn phù hợp.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
});

const OptionRow = memo(function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: SelectOption;
  selected: boolean;
  onSelect: (option: SelectOption) => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked: selected, selected }}
      android_ripple={{ color: colors.primaryContainer }}
      onPress={() => onSelect(option)}
      style={({ pressed }) => ({
        minHeight: 50,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        borderCurve: "continuous",
        backgroundColor: selected
          ? colors.primaryContainer
          : pressed
            ? colors.surfaceMuted
            : colors.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
      })}
    >
      <Text
        selectable={false}
        numberOfLines={2}
        style={{
          flex: 1,
          color: selected ? colors.primary : colors.text,
          fontFamily: selected ? fonts.semibold : fonts.regular,
        }}
      >
        {option.label}
      </Text>
      {selected ? (
        <AppIcon name="check-decagram-outline" color={colors.primary} size={18} />
      ) : null}
    </Pressable>
  );
});

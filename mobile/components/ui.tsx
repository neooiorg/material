import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BadgeCheck, BarChart3, Bell, Building2, CalendarDays, ChevronDown, ClipboardList,
  Download, History, LayoutDashboard, LogOut, Menu as MenuIcon, Package, Users,
  Plus, PlusSquare, Scale, Search, Truck, WalletCards, X, type LucideIcon,
} from "lucide-react-native";
import {
  Button as HeroButton, Card as HeroCard, Chip as HeroChip,
  Dialog as HeroDialog, Input as HeroInput, Menu as HeroMenu,
  Separator as HeroSeparator, Spinner as HeroSpinner, Typography,
} from "heroui-native";
import { colors, fonts, radius, spacing } from "@/theme";

const iconMap: Record<string, LucideIcon> = {
  "bell-outline": Bell, calendar: CalendarDays, menu: MenuIcon,
  "view-dashboard-outline": LayoutDashboard, "clipboard-list-outline": ClipboardList,
  "plus-box-outline": PlusSquare, "office-building": Building2, "package-variant": Package,
  "wallet-outline": WalletCards, "scale-balance": Scale, "chart-bar": BarChart3,
  history: History, "check-decagram-outline": BadgeCheck, "truck-outline": Truck,
  logout: LogOut, download: Download, plus: Plus, "chevron-down": ChevronDown,
  "account-group": Users, search: Search,
};

export function AppIcon({ name, size = 19, color = colors.label }: { name?: string; size?: number; color?: string }) {
  if (name === "google") return <GoogleLogo size={size} />;
  const Icon = (name && iconMap[name]) || X;
  return <Icon size={size} color={color} strokeWidth={2.1} />;
}

function GoogleLogo({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Google">
    <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.89c2.27-2.09 3.53-5.17 3.53-8.67Z" />
    <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.89-3.02c-1.08.72-2.45 1.15-4.04 1.15-3.12 0-5.77-2.11-6.71-4.95H1.27v3.11A11.99 11.99 0 0 0 12 24Z" />
    <Path fill="#FBBC05" d="M5.29 14.27A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.55.38-2.27V6.62H1.27A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.27 5.38l4.02-3.11Z" />
    <Path fill="#EA4335" d="M12 4.78c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.21 15.24 0 12 0A11.99 11.99 0 0 0 1.27 6.62l4.02 3.11C6.23 6.89 8.88 4.78 12 4.78Z" />
  </Svg>;
}

type ButtonPressEvent = { stopPropagation?: () => void };

type ButtonProps = PropsWithChildren<{
  mode?: "contained" | "outlined" | "text";
  icon?: string; rightIcon?: string; loading?: boolean; disabled?: boolean; compact?: boolean;
  textColor?: string; buttonColor?: string; onPress?: () => void;
  contentStyle?: object; style?: object; labelStyle?: object;
}>;

export function Button({ children, mode = "text", icon, rightIcon, loading, disabled, compact, textColor, buttonColor, onPress, contentStyle, style, labelStyle }: ButtonProps) {
  const isContained = mode === "contained";
  const isDanger = buttonColor === "#b91c1c" || buttonColor === colors.danger;
  const variant = isContained ? (isDanger ? "danger" : "primary") : mode === "outlined" ? "outline" : "ghost";
  const labelColor = textColor ?? (isContained ? colors.onPrimary : colors.primary);
  const buttonStyle = { minHeight: compact ? 36 : 48, ...(buttonColor && variant !== "danger" ? { backgroundColor: buttonColor } : {}), ...(contentStyle ?? {}), ...(style ?? {}) };
  return (
    <HeroButton
    variant={variant}
    size={compact ? "sm" : "md"}
    isDisabled={disabled || loading}
    onPress={(event: ButtonPressEvent) => {
      // Buttons are frequently rendered inside a pressable table row. Prevent
      // the row from stealing the action or navigating after the button fires.
      event?.stopPropagation?.();
      // Request handlers themselves own their loading/disabled state. A
      // global debounce here made a valid second tap look unresponsive when
      // the first tap had no visible result (for example validation).
      onPress?.();
    }}
    style={buttonStyle as any}
  >
    {loading ? <HeroSpinner size="sm" color={labelColor} /> : icon ? <AppIcon name={icon} color={labelColor} size={compact ? 16 : 18} /> : null}
    <HeroButton.Label numberOfLines={compact ? 1 : 2} ellipsizeMode="tail" style={[{ color: labelColor, fontFamily: fonts.medium, lineHeight: compact ? 18 : 20, textAlign: "center", flexShrink: 1, flexWrap: "wrap", includeFontPadding: false }, labelStyle] as any}>{children}</HeroButton.Label>
    {!loading && rightIcon ? <AppIcon name={rightIcon} color={labelColor} size={compact ? 16 : 18} /> : null}
    </HeroButton>
  );
}

type TextProps = PropsWithChildren<{ variant?: string; selectable?: boolean; style?: object; numberOfLines?: number; ellipsizeMode?: "head" | "middle" | "tail" | "clip"; onPress?: () => void; onLongPress?: () => void }>;
export function Text({ children, variant, style, selectable = true, numberOfLines, ellipsizeMode = "tail", onPress, onLongPress }: TextProps) {
  const variants: Record<string, { type: "h1" | "h2" | "h3" | "h4" | "body" | "body-sm" | "body-xs"; fontFamily: string }> = {
    headlineSmall: { type: "h3", fontFamily: fonts.semibold },
    headlineMedium: { type: "h2", fontFamily: fonts.semibold },
    titleLarge: { type: "h4", fontFamily: fonts.semibold },
    titleMedium: { type: "h4", fontFamily: fonts.semibold },
    titleSmall: { type: "body", fontFamily: fonts.semibold },
    labelSmall: { type: "body-xs", fontFamily: fonts.medium },
    labelMedium: { type: "body-sm", fontFamily: fonts.medium },
  };
  const props = variants[variant ?? ""] ?? { type: "body" as const, fontFamily: fonts.regular };
  return <Typography selectable={selectable} type={props.type} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} onPress={onPress} onLongPress={onLongPress} style={[{ color: colors.text, fontFamily: props.fontFamily }, style] as any}>{children}</Typography>;
}

export function TruncatedText({ children, title = "Nội dung đầy đủ", lines = 1, variant, style }: PropsWithChildren<{ title?: string; lines?: number; variant?: string; style?: object }>) {
  const [open, setOpen] = useState(false);
  const value = typeof children === "string" || typeof children === "number" ? String(children) : "";
  if (!value) return <Text variant={variant} style={style}>{children}</Text>;
  return <>
    <Text selectable={false} variant={variant} numberOfLines={lines} ellipsizeMode="tail" onLongPress={() => setOpen(true)} style={style}>
      {value}
    </Text>
    <Dialog visible={open} onDismiss={() => setOpen(false)}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Content><Text selectable>{value}</Text></Dialog.Content>
      <Dialog.Actions><Button mode="contained" onPress={() => setOpen(false)}>Đóng</Button></Dialog.Actions>
    </Dialog>
  </>;
}

type CardProps = PropsWithChildren<{ mode?: string; onPress?: () => void; style?: object }>;
function CardRoot({ children, mode, onPress, style }: CardProps) {
  const card = <HeroCard variant={mode === "contained" ? "secondary" : "default"} style={[{ borderCurve: "continuous", borderRadius: radius.lg }, style] as any}>{children}</HeroCard>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] })}>{card}</Pressable> : card;
}
function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: () => ReactNode }) {
  return <HeroCard.Header style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}><View style={{ flex: 1, gap: 3 }}>
    <TruncatedText title="Tiêu đề" lines={2} variant="titleMedium" style={{ color: colors.text }}>{title}</TruncatedText>
    {subtitle ? <TruncatedText title={title} lines={2} style={{ color: colors.textSecondary }}>{subtitle}</TruncatedText> : null}
  </View>{right?.()}</HeroCard.Header>;
}
function CardContent({ children, style }: PropsWithChildren<{ style?: object }>) { return <HeroCard.Body style={[{ gap: 8 }, style] as any}>{children}</HeroCard.Body>; }
export const Card = Object.assign(CardRoot, { Title: CardTitle, Content: CardContent });

type InputProps = Record<string, any> & { label?: string; onChangeText?: (value: string) => void; style?: object };

function InputBackground({ focused }: { focused: boolean }) {
  // HeroUI Native leaves the Input bare for the default theme unless a
  // background layer is supplied. Rendering its own background slot keeps
  // every field (including fields inside dialogs) in the HeroUI component
  // system while giving it a visible, touch-friendly outline.
  return <HeroInput.Background
    fallbackColor="field"
    style={{
      backgroundColor: colors.surface,
      borderColor: focused ? colors.primary : colors.border,
      borderWidth: focused ? 1.5 : 1,
      borderRadius: radius.md,
    }}
  />;
}

const inputTextStyle = {
  minHeight: 48,
  paddingHorizontal: spacing.md,
  fontFamily: fonts.regular,
  fontSize: 16,
  color: colors.text,
} as const;

export function Searchbar({ placeholder, value, onChangeText }: { placeholder?: string; value?: string; onChangeText?: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  return <HeroInput
    background={<InputBackground focused={focused} />}
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={inputTextStyle}
  />;
}

export function TextInput({ label, onChangeText, style, multiline, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}>
    {label ? <Text variant="labelMedium" style={{ color: colors.label }}>{label}</Text> : null}
    <HeroInput
      {...props}
      background={<InputBackground focused={focused} />}
      multiline={multiline}
      onChangeText={onChangeText}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={[{ ...inputTextStyle, minHeight: multiline ? 104 : 48, paddingVertical: multiline ? spacing.md : 0, textAlignVertical: multiline ? "top" : "center" }, style] as any}
    />
  </View>;
}

export function Divider() { return <HeroSeparator />; }
export function ActivityIndicator() { return <HeroSpinner size="lg" color={colors.primary} />; }
export function Badge({ children, style }: PropsWithChildren<{ style?: object }>) { return <HeroChip size="sm" color="danger" style={style as any}><HeroChip.Label style={{ fontFamily: fonts.medium }}>{children}</HeroChip.Label></HeroChip>; }
export function IconButton({ icon, onPress, disabled = false }: { icon: string; onPress?: () => void; disabled?: boolean }) {
  return <HeroButton
    isIconOnly
    variant="ghost"
    isDisabled={disabled}
    accessibilityLabel={icon}
    onPress={(event: ButtonPressEvent) => {
      event?.stopPropagation?.();
      if (disabled) return;
      onPress?.();
    }}
  ><AppIcon name={icon} /></HeroButton>;
}

export function InfoRow({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "primary" | "danger" | "success" | "info" }) {
  const valueColor = tone === "primary" ? colors.primary : tone === "danger" ? colors.danger : tone === "success" ? colors.success : tone === "info" ? colors.info : colors.text;
  return <View style={{ minHeight: 32, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
    <TruncatedText title={label} style={{ color: colors.textSecondary, flexShrink: 1 }}>{label}</TruncatedText>
    {typeof value === "string" || typeof value === "number" ? (
      <TruncatedText title={label} lines={2} style={{ color: valueColor, fontFamily: fonts.medium, textAlign: "right", flex: 1 }}>{value}</TruncatedText>
    ) : (
      value
    )}
  </View>;
}

function ListItem({ title, left, onPress, disabled = false }: { title: string; left?: () => ReactNode; onPress?: () => void; disabled?: boolean }) {
  return (
    <HeroButton variant="ghost" isDisabled={disabled} onPress={() => {
      if (disabled) return;
      onPress?.();
    }} style={{ justifyContent: "flex-start", minHeight: 48 }}>
      <>{left?.()}<HeroButton.Label numberOfLines={2} ellipsizeMode="tail" style={{ color: colors.text, fontFamily: fonts.semibold, flex: 1, flexWrap: "wrap", lineHeight: 20, includeFontPadding: false }}>{title}</HeroButton.Label></>
    </HeroButton>
  );
}
function ListIcon({ icon }: { icon: string }) { return <AppIcon name={icon} />; }
export const List = { Item: ListItem, Icon: ListIcon };

export function Chip({ children, style, labelStyle, compact }: PropsWithChildren<{ style?: object; labelStyle?: object; compact?: boolean }>) {
  const [open, setOpen] = useState(false);
  const value = typeof children === "string" || typeof children === "number" ? String(children) : "";
  return <>
    <HeroChip size={compact ? "sm" : "md"} color="accent" variant="soft" style={style as any}><HeroChip.Label onLongPress={value ? () => setOpen(true) : undefined} numberOfLines={1} ellipsizeMode="tail" style={[{ fontFamily: fonts.medium, maxWidth: 148 }, labelStyle] as any}>{children}</HeroChip.Label></HeroChip>
    {value ? <Dialog visible={open} onDismiss={() => setOpen(false)}>
      <Dialog.Title>Nội dung đầy đủ</Dialog.Title>
      <Dialog.Content><Text selectable>{value}</Text></Dialog.Content>
      <Dialog.Actions><Button mode="contained" onPress={() => setOpen(false)}>Đóng</Button></Dialog.Actions>
    </Dialog> : null}
  </>;
}
function DialogRoot({ visible, onDismiss, children }: PropsWithChildren<{ visible: boolean; onDismiss?: () => void }>) {
  if (!visible) return null;
  return <HeroDialog isOpen animation="disable-all" onOpenChange={(open) => { if (!open) onDismiss?.(); }}>
    <HeroDialog.Portal>
      <HeroDialog.Overlay />
      <HeroDialog.Content isSwipeable={false} style={{ borderCurve: "continuous" }}>{children}</HeroDialog.Content>
    </HeroDialog.Portal>
  </HeroDialog>;
}
function DialogTitle({ children }: PropsWithChildren) { return <HeroDialog.Title style={{ fontFamily: fonts.semibold }}>{children}</HeroDialog.Title>; }
function DialogContent({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[{ gap: 8 }, style] as any}>{children}</View>; }
function DialogActions({ children }: PropsWithChildren) { return <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{children}</View>; }
function DialogScrollArea({ children }: PropsWithChildren) { return <View>{children}</View>; }
export const Dialog = Object.assign(DialogRoot, { Title: DialogTitle, Content: DialogContent, Actions: DialogActions, ScrollArea: DialogScrollArea });

function MenuRoot({ visible, onDismiss, anchor, children }: PropsWithChildren<{ visible: boolean; onDismiss: () => void; anchor: ReactNode }>) { return <HeroMenu isOpen={visible} onOpenChange={(open) => { if (!open) onDismiss(); }} presentation="popover"><HeroMenu.Trigger>{anchor}</HeroMenu.Trigger><HeroMenu.Portal><HeroMenu.Overlay /><HeroMenu.Content presentation="popover">{children}</HeroMenu.Content></HeroMenu.Portal></HeroMenu>; }
function MenuItem({ title, onPress }: { title: string; onPress: () => void }) { return <HeroMenu.Item onPress={onPress}><TruncatedText title="Mục menu" lines={2} style={{ fontFamily: fonts.medium }}>{title}</TruncatedText></HeroMenu.Item>; }
export const Menu = Object.assign(MenuRoot, { Item: MenuItem });

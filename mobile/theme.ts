// Design tokens — nguồn chân lý phía JS cho toàn app / Single source of truth (JS side).
// Đồng bộ với các biến CSS override của HeroUI Native trong `global.css`.
// Any hard-coded color/spacing across screens should reference these tokens.

/** Bảng màu ngữ nghĩa / Semantic color palette. */
export const colors = {
  // Thương hiệu / Brand
  primary: "#0B57D0",
  primaryContainer: "#EEF4FF",
  primaryBorder: "#D2E3FC",
  onPrimary: "#FFFFFF",

  // Nền & bề mặt / Backgrounds & surfaces
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F4F9",

  // Chữ / Text
  text: "#2B2F36",
  textSecondary: "#5F6368",
  textMuted: "#80868B",
  label: "#3C4043",

  // Ngữ nghĩa trạng thái / Status semantics
  success: "#188038",
  successContainer: "#E6F4EA",
  danger: "#C5221F",
  dangerContainer: "#FCE8E6",
  warning: "#C26401",
  warningContainer: "#FEF3E0",
  info: "#1A73E8",
  infoContainer: "#E8F0FE",

  // Đường kẻ & track / Lines & tracks
  border: "#E3E7EC",
  track: "#E7ECF3",
} as const;

/** Màu theo trạng thái đơn / Per order-status colors (nền + chữ + chấm). */
export const statusColors = {
  pending: { bg: "#FEF3C7", fg: "#92580A", dot: colors.warning },
  approved: { bg: "#DCFCE7", fg: "#15803D", dot: colors.success },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C", dot: colors.danger },
  delivered: { bg: "#DBEAFE", fg: "#1D4ED8", dot: colors.info },
} as const;

/** Bảng màu cho biểu đồ / Chart categorical palette. */
export const chartPalette = [
  colors.primary, colors.success, colors.warning,
  "#7B1FA2", colors.danger, "#007B83", colors.info, "#E37400",
] as const;

/** Khoảng cách / Spacing scale (px). */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** Bo góc / Radius scale (px). */
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;

/** Họ chữ / Font families (Manrope). */
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
} as const;

/** Đổ bóng / Elevation presets cho các View tùy biến (KPI cards…). */
export const elevation = {
  card: {
    shadowColor: "#0B1524",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

// Backward-compat: giữ nguyên export cũ để không phá vỡ import hiện có.
export const appTheme = { primary: colors.primary, background: colors.background, surface: colors.surface } as const;

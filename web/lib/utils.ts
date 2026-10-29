export { cn } from "cn";

/** Định dạng tiền VND: 1234567 -> "1.234.567 ₫" */
export function formatVND(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Định dạng số kiểu Việt Nam: 1234.5 -> "1.234,5" */
export function formatNumber(
  value: number | string | null | undefined,
  maxFractionDigits = 3
): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}

/** Định dạng phần trăm: 12.34 -> "12,3%" */
export function formatPercent(
  value: number | string | null | undefined,
  maxFractionDigits = 1
): string {
  const n = toNumber(value);
  return (
    new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: maxFractionDigits,
    }).format(n) + "%"
  );
}

/** Chuyển numeric (string từ Drizzle) hoặc number về number an toàn */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Định dạng ngày kiểu Việt Nam: dd/MM/yyyy */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Định dạng ngày giờ kiểu Việt Nam: HH:mm dd/MM/yyyy */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

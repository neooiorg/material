export const toNumber = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : 0; };
export const formatVND = (value: unknown) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(toNumber(value));
export const formatNumber = (value: unknown, digits = 3) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(toNumber(value));
export const formatPercent = (value: unknown) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(toNumber(value))}%`;
export const formatDate = (value: unknown) => value ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(String(value))) : "—";
export const formatDateTime = (value: unknown) => value ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(String(value))) : "—";
export const roleLabels = { admin: "Quản trị", site: "Bộ phận thi công", accountant: "Kế toán" } as const;
export const statusLabels = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", delivered: "Đã hoàn tất (cũ)" } as const;

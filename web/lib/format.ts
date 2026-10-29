export const money = (value: number | string | null | undefined) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value ?? 0));
export const number = (value: number | string | null | undefined) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));
export const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
export const statusText: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", delivered: "Đã giao", active: "Đang thực hiện", completed: "Hoàn thành", paused: "Tạm dừng" };

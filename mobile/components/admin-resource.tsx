import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Dialog, Text, TruncatedText } from "@/components/ui";
import { api } from "@/lib/api";
import { useNotice } from "./snackbar";
import { colors } from "@/theme";
import { DataTable } from "@/components/data-table";
import { Empty } from "@/components/screen";

type Field = { key: string; label: string };

export function AdminResource({ title, endpoint, fields, rows, refresh, createHref, editHref, detailHref }: { title: string; endpoint: string; fields: Field[]; rows: Record<string, unknown>[]; refresh: () => void; createHref: string; editHref: (id: string | number) => string; detailHref?: (id: string | number) => string }) {
  const notice = useNotice();
  const [target, setTarget] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (!target || deleting) return;
    setDeleting(true);
    try { await api(`${endpoint}/${target.id}`, { method: "DELETE" }); setTarget(null); notice("Đã xóa."); refresh(); }
    catch (error) { notice(error instanceof Error ? error.message : "Không thể xóa."); }
    finally { setDeleting(false); }
  }
  const filterField = fields.find((field) => field.key === "status") ?? fields.find((field) => field.key === "group");
  const filterValues = filterField ? [...new Set(rows.map((row) => String(row[filterField.key] ?? "")).filter(Boolean))] : [];
  return <><Button mode="contained" icon="plus" onPress={() => router.push(createHref as never)}>Thêm {title.toLowerCase()}</Button>{rows.length > 0 ? <DataTable rows={rows as (Record<string, unknown> & { id: string | number })[]} onPressRow={detailHref ? (row) => router.push(detailHref(row.id) as never) : undefined} getSearchText={(row) => fields.map((field) => String(row[field.key] ?? "")).join(" ")} searchPlaceholder={`Tìm ${title.toLowerCase()}`} filters={filterField ? [{ key: filterField.key, label: `Tất cả ${filterField.label.toLowerCase()}`, options: filterValues.map((value) => ({ value, label: value })), matches: (row, value) => String(row[filterField.key] ?? "") === value }] : []} columns={[
    { key: "name", label: "Tên", width: 176, render: (row) => <TruncatedText title="Tên" lines={2} variant="labelMedium">{String(row.name ?? "—")}</TruncatedText> },
    ...fields.filter((field) => field.key !== "name").map((field) => ({ key: field.key, label: field.label, width: 150, render: (row: Record<string, unknown>) => String(row[field.key] ?? "—") })),
    { key: "actions", label: "Thao tác", width: 206, render: (row) => <View style={{ flexDirection: "row", gap: 4 }}><Button compact mode="outlined" onPress={() => router.push(editHref(row.id) as never)}>Sửa</Button><Button compact textColor={colors.danger} onPress={() => setTarget(row)}>Xóa</Button></View> },
  ]} /> : <Empty>Chưa có {title.toLowerCase()} nào.</Empty>}<Dialog visible={!!target} onDismiss={() => { if (!deleting) setTarget(null); }}><Dialog.Title>Xóa {title.toLowerCase()}?</Dialog.Title><Dialog.Content><Text>Hành động này không thể hoàn tác.</Text></Dialog.Content><Dialog.Actions><Button disabled={deleting} onPress={() => setTarget(null)}>Hủy</Button><Button textColor={colors.danger} loading={deleting} disabled={deleting} onPress={remove}>Xóa</Button></Dialog.Actions></Dialog></>;
}

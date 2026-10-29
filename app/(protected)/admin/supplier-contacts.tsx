import { useState } from "react";
import { View } from "react-native";
import { router as expoRouter, Stack } from "expo-router";
import { Button, Card, Text, TextInput, TruncatedText } from "@/components/ui";
import { Empty, Screen, StateView } from "@/components/screen";
import { useApi } from "@/hooks/use-api";
import { api, jsonBody } from "@/lib/api";
import { useNotice } from "@/components/snackbar";
import { colors } from "@/theme";
import { DataTable } from "@/components/data-table";

const router = expoRouter as unknown as { push: (href: string) => void };

type Contact = { id: number; name: string; phone: string };
export default function SupplierContacts() {
  const query = useApi<Contact[]>("/api/supplier-contacts");
  const notice = useNotice();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null); const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  function reset() { setName(""); setPhone(""); setEditingId(null); }
  function edit(contact: Contact) { setEditingId(contact.id); setName(contact.name); setPhone(contact.phone); }
  async function save() {
    setSaving(true);
    try {
      await api(editingId ? `/api/supplier-contacts/${editingId}` : "/api/supplier-contacts", {
        method: editingId ? "PATCH" : "POST", ...jsonBody({ name, phone }),
      });
      reset(); notice(editingId ? "Đã cập nhật đơn vị cung cấp." : "Đã thêm đơn vị cung cấp."); query.refresh();
    } catch (error) { notice(error instanceof Error ? error.message : "Không thể lưu."); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    if (deletingId !== null) return;
    setDeletingId(id);
    try { await api(`/api/supplier-contacts/${id}`, { method: "DELETE" }); if (editingId === id) reset(); query.refresh(); }
    catch (error) { notice(error instanceof Error ? error.message : "Không thể xóa."); }
    finally { setDeletingId(null); }
  }
  return <Screen><Stack.Screen options={{ title: "Đơn vị cung cấp" }} />
    <Card><Card.Content style={{ gap: 10 }}><Text variant="titleMedium">{editingId ? "Sửa liên hệ Zalo" : "Thêm liên hệ Zalo"}</Text>
      <TextInput label="Tên đơn vị" value={name} onChangeText={setName} />
      <TextInput label="Số Zalo" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Button mode="contained" loading={saving} disabled={saving || !name.trim() || !phone.trim()} onPress={save}>{editingId ? "Lưu thay đổi" : "Thêm đơn vị"}</Button>
      {editingId && <Button mode="outlined" onPress={reset}>Hủy sửa</Button>}
    </Card.Content></Card>
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data?.length ? <DataTable rows={query.data} onPressRow={(contact) => router.push(`/details/supplier-contact/${contact.id}`)} searchPlaceholder="Tìm đơn vị hoặc số Zalo" getSearchText={(contact) => `${contact.name} ${contact.phone}`} columns={[
      { key: "name", label: "Đơn vị", width: 200, render: (contact) => <TruncatedText title="Đơn vị cung cấp" lines={2} variant="labelMedium">{contact.name}</TruncatedText> },
      { key: "phone", label: "Số Zalo", width: 150, render: (contact) => contact.phone },
      { key: "actions", label: "Thao tác", width: 200, render: (contact) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}><Button compact mode="outlined" disabled={deletingId !== null} onPress={() => edit(contact)}>Sửa</Button><Button compact textColor={colors.danger} loading={deletingId === contact.id} disabled={deletingId !== null} onPress={() => remove(contact.id)}>Xóa</Button></View> },
    ]}/> : <Empty>Chưa có đơn vị cung cấp nào.</Empty>}</StateView>
  </Screen>;
}

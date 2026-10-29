import { useMemo, useState } from "react";
import { View } from "react-native";
import { router, Stack } from "expo-router";
import { Button, Card, Text, TextInput, TruncatedText } from "@/components/ui";
import { Screen, StateView } from "@/components/screen";
import { SelectMenu } from "@/components/select-menu";
import { useApi } from "@/hooks/use-api";
import { api, jsonBody } from "@/lib/api";
import { formatVND, toNumber } from "@/lib/format";
import { useNotice } from "@/components/snackbar";
import { colors, fonts, spacing } from "@/theme";

type Options = {
  projects: { id: number; code: string; name: string; status: string; defaultSupplierContactId?: number | null }[];
  materials: { id: number; name: string; unit: string; group: string }[];
  contacts: { id: number; name: string; phone: string }[];
  projectContacts: Record<number, number[]>;
  suggestedPrices: Record<number, number>;
};
type Row = { key: number; materialId: string; qty: string; unitPrice: string };

export default function NewOrder() {
  const query = useApi<Options>("/api/order-form-options");
  const notice = useNotice();
  const [projectId, setProjectId] = useState("");
  const [supplierContactId, setSupplierContactId] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 1, materialId: "", qty: "", unitPrice: "" }]);
  const [loading, setLoading] = useState(false);
  const total = useMemo(() => rows.reduce((sum, row) => sum + toNumber(row.qty) * toNumber(row.unitPrice), 0), [rows]);
  const linkedContacts = useMemo(() => {
    const ids = query.data?.projectContacts[Number(projectId)] ?? [];
    return (query.data?.contacts ?? []).filter((contact) => ids.includes(contact.id));
  }, [projectId, query.data]);

  function chooseProject(value: string) {
    setProjectId(value);
    const project = query.data?.projects.find((item) => item.id === Number(value));
    setSupplierContactId(project?.defaultSupplierContactId ? String(project.defaultSupplierContactId) : "");
  }
  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row;
      const next = { ...row, ...patch };
      if (patch.materialId && !row.unitPrice) next.unitPrice = String(query.data?.suggestedPrices[Number(patch.materialId)] ?? "");
      return next;
    }));
  }
  async function submit() {
    setLoading(true);
    try {
      const result = await api<{ orderId: number }>("/api/orders", {
        method: "POST",
        ...jsonBody({
          projectId: Number(projectId),
          supplierContactId: supplierContactId ? Number(supplierContactId) : null, note,
          items: rows.map((row) => ({ materialId: Number(row.materialId), qty: toNumber(row.qty), unitPrice: toNumber(row.unitPrice) })),
        }),
      });
      notice("Đã gửi đơn đặt vật tư.");
      router.replace(`/orders/${result.orderId}`);
    } catch (error) { notice(error instanceof Error ? error.message : "Không thể gửi đơn."); }
    finally { setLoading(false); }
  }
  return <Screen><Stack.Screen options={{ title: "Đặt vật tư" }} />
    <StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data && <>
      <SelectMenu label="Chọn công trình" value={projectId} onChange={chooseProject} options={query.data.projects.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))} />
      <SelectMenu label="Đơn vị cung cấp liên hệ" value={supplierContactId} onChange={setSupplierContactId} options={[{ value: "", label: "Chưa chọn đơn vị liên hệ" }, ...linkedContacts.map((item) => ({ value: String(item.id), label: `${item.name} · ${item.phone}` }))]} />
      {rows.map((row, index) => <Card key={row.key}><Card.Title title={`Dòng vật tư ${index + 1}`} /><Card.Content style={{ gap: 10 }}>
        <SelectMenu label="Chọn vật tư" value={row.materialId} onChange={(value) => update(row.key, { materialId: value })} options={(query.data?.materials ?? []).map((item) => ({ value: String(item.id), label: `${item.name} (${item.unit}) · ${item.group}` }))} />
        <TextInput label="Số lượng" keyboardType="decimal-pad" value={row.qty} onChangeText={(value) => update(row.key, { qty: value })} />
        <TextInput label="Đơn giá (₫)" keyboardType="decimal-pad" value={row.unitPrice} onChangeText={(value) => update(row.key, { unitPrice: value })} />
        <View style={{ minHeight: 46, borderRadius: 12, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <Text selectable={false} style={{ color: colors.textSecondary, flexShrink: 1 }}>Thành tiền</Text>
          <TruncatedText title="Thành tiền" lines={2} style={{ fontFamily: fonts.semibold, color: colors.text, maxWidth: 170, textAlign: "right" }}>{formatVND(toNumber(row.qty) * toNumber(row.unitPrice))}</TruncatedText>
        </View>
        <Button mode="outlined" textColor={colors.danger} disabled={rows.length === 1} onPress={() => setRows((current) => current.filter((item) => item.key !== row.key))}>Xóa dòng</Button>
      </Card.Content></Card>)}
      <Button mode="outlined" icon="plus" onPress={() => setRows((current) => [...current, { key: Date.now(), materialId: "", qty: "", unitPrice: "" }])}>Thêm dòng</Button>
      <TextInput label="Ghi chú" multiline value={note} onChangeText={setNote} />
      <Card mode="contained" style={{ backgroundColor: colors.primaryContainer, borderColor: colors.primaryBorder }}>
        <Card.Content style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <Text selectable={false} variant="labelMedium" style={{ color: colors.primary, flexShrink: 1 }}>Tổng cộng</Text>
          <TruncatedText title="Tổng cộng" lines={2} variant="titleMedium" style={{ color: colors.primary, maxWidth: 180, textAlign: "right" }}>{formatVND(total)}</TruncatedText>
        </Card.Content>
      </Card>
      <Button mode="contained" loading={loading} disabled={loading} onPress={submit}>Gửi đơn</Button>
    </>}</StateView>
  </Screen>;
}

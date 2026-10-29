import { useEffect, useState } from "react";
import { View } from "react-native";
import { router as expoRouter, Stack } from "expo-router";
import { Button, Card, Dialog, Text, TextInput, TruncatedText } from "@/components/ui";
import { Empty, Screen, StateView } from "@/components/screen";
import { SelectMenu } from "@/components/select-menu";
import { DonutChart } from "@/components/charts";
import { useApi } from "@/hooks/use-api";
import { api, jsonBody } from "@/lib/api";
import { formatNumber, formatVND, toNumber } from "@/lib/format";
import { useNotice } from "@/components/snackbar";
import { colors } from "@/theme";
import { DataTable } from "@/components/data-table";

const router = expoRouter as unknown as { push: (href: unknown) => void };

type Project = { id: number; code: string; name: string };
type Material = { id: number; name: string; unit: string; group: string };
type Row = { id: number; materialId: number; name: string; unit: string; qty: string; unitPrice: string };

export default function Budgets() {
  const projects = useApi<Project[]>("/api/projects");
  const materials = useApi<Material[]>("/api/materials");
  const [projectId, setProjectId] = useState("");
  const rows = useApi<Row[]>(projectId ? `/api/budgets?projectId=${projectId}` : "/api/budgets?projectId=0");
  const notice = useNotice();
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId && projects.data?.[0]) setProjectId(String(projects.data[0].id));
  }, [projects.data, projectId]);

  async function save(input = { materialId: Number(materialId), qty, unitPrice }) {
    if (saving) return;
    setSaving(true);
    try {
      await api("/api/budgets", { method: "PUT", ...jsonBody({ projectId: Number(projectId), materialId: input.materialId, qty: toNumber(input.qty), unitPrice: toNumber(input.unitPrice) }) });
      setMaterialId(""); setQty(""); setUnitPrice(""); setEditing(null);
      notice("Đã lưu dự toán."); rows.refresh();
    } catch (error) { notice(error instanceof Error ? error.message : "Không thể lưu."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (saving) return;
    setSaving(true);
    try { await api(`/api/budgets/${id}`, { method: "DELETE" }); notice("Đã xóa dòng dự toán."); rows.refresh(); }
    catch (error) { notice(error instanceof Error ? error.message : "Không thể xóa."); }
    finally { setSaving(false); }
  }

  const total = (rows.data ?? []).reduce((sum, row) => sum + toNumber(row.qty) * toNumber(row.unitPrice), 0);
  return <Screen>
    <Stack.Screen options={{ title: "Dự toán công trình" }} />
    <StateView loading={projects.loading || materials.loading} error={projects.error || materials.error}>
      {projects.data && materials.data && <>
        <SelectMenu value={projectId} onChange={setProjectId} options={projects.data.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))} />
        <Card><Card.Title title="Thêm / cập nhật dòng dự toán" /><Card.Content style={{ gap: 8 }}>
          <SelectMenu label="Chọn vật tư" value={materialId} onChange={setMaterialId} options={materials.data.map((item) => ({ value: String(item.id), label: `${item.name} (${item.unit}) · ${item.group}` }))} />
          <TextInput label="Số lượng" keyboardType="decimal-pad" value={qty} onChangeText={setQty} />
          <TextInput label="Đơn giá" keyboardType="decimal-pad" value={unitPrice} onChangeText={setUnitPrice} />
          <Button mode="contained" loading={saving} disabled={saving} onPress={() => save()}>Lưu</Button>
        </Card.Content></Card>
        <StateView loading={rows.loading} error={rows.error} retry={rows.refresh}>
          {!rows.data?.length ? <Empty>Chưa có dòng dự toán.</Empty> : <DataTable rows={rows.data} onPressRow={(row) => router.push({ pathname: `/details/budget/${row.id}`, params: { projectId } })} columns={[
            { key: "name", label: "Vật tư", width: 180, render: (row) => <TruncatedText title="Vật tư" lines={2} variant="labelMedium">{row.name} ({row.unit})</TruncatedText> },
            { key: "qty", label: "Số lượng", width: 116, align: "right", render: (row) => `${formatNumber(row.qty)} ${row.unit}` },
            { key: "price", label: "Đơn giá", width: 140, align: "right", render: (row) => formatVND(row.unitPrice) },
            { key: "amount", label: "Thành tiền", width: 148, align: "right", render: (row) => formatVND(toNumber(row.qty) * toNumber(row.unitPrice)) },
            { key: "actions", label: "Thao tác", width: 190, render: (row) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}><Button compact mode="outlined" disabled={saving} onPress={() => setEditing({ ...row })}>Sửa</Button><Button compact textColor={colors.danger} loading={saving} disabled={saving} onPress={() => remove(row.id)}>Xóa</Button></View> },
          ]}/>}
          {!!rows.data?.length && <Card><Card.Title title="Cơ cấu dự toán" /><Card.Content><DonutChart money centerLabel="Dự toán" data={rows.data.map((row) => ({ name: row.name, value: toNumber(row.qty) * toNumber(row.unitPrice) }))} /></Card.Content></Card>}
          <Text selectable variant="titleLarge">Tổng dự toán: {formatVND(total)}</Text>
        </StateView>
      </>}
    </StateView>
    <Dialog visible={!!editing} onDismiss={() => { if (!saving) setEditing(null); }}><Dialog.Title>Sửa dự toán</Dialog.Title><Dialog.Content style={{ gap: 8 }}>
      {editing && <><Text selectable>{editing.name}</Text><TextInput label="Số lượng" keyboardType="decimal-pad" value={editing.qty} onChangeText={(value) => setEditing({ ...editing, qty: value })} /><TextInput label="Đơn giá" keyboardType="decimal-pad" value={editing.unitPrice} onChangeText={(value) => setEditing({ ...editing, unitPrice: value })} /></>}
    </Dialog.Content><Dialog.Actions><Button disabled={saving} onPress={() => setEditing(null)}>Hủy</Button><Button loading={saving} disabled={saving} onPress={() => editing && save(editing)}>Lưu</Button></Dialog.Actions></Dialog>
  </Screen>;
}

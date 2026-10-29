import { Stack } from "expo-router";
import { Screen, StateView } from "@/components/screen";
import { AdminResource } from "@/components/admin-resource";
import { useApi } from "@/hooks/use-api";
const units = ["m³", "kg", "tấn", "viên", "bao", "cây", "m²", "m"].map((value) => ({ value, label: value })); const groups = ["Cát", "Đá", "Xi măng", "Bê tông", "Gạch", "Thép", "Khác"].map((value) => ({ value, label: value }));
export default function Materials() { const query = useApi<Record<string, unknown>[]>("/api/materials"); return <Screen><Stack.Screen options={{ title: "Quản lý vật tư" }} /><StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data && <AdminResource title="Vật tư" endpoint="/api/materials" rows={query.data} refresh={query.refresh} createHref="/admin/materials/new" editHref={(id) => `/admin/materials/${id}`} detailHref={(id) => `/details/material/${id}`} fields={[{ key: "code", label: "Mã" }, { key: "name", label: "Tên vật tư" }, { key: "unit", label: "Đơn vị" }, { key: "group", label: "Nhóm" }]} />}</StateView></Screen>; }

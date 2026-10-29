import { router, Stack } from "expo-router";
import { Text } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { Empty, Screen, StateView } from "@/components/screen";
import { useApi } from "@/hooks/use-api";

type Project = { id: number; code: string; name: string; address?: string; status: string };
export default function ProjectsSummaryList() { const query = useApi<Project[]>("/api/projects"); const statuses = [...new Set((query.data ?? []).map((project) => project.status))]; return <Screen><Stack.Screen options={{ title: "Tổng hợp công trình" }} /><StateView loading={query.loading} error={query.error} retry={query.refresh}>{query.data?.length ? <DataTable rows={query.data} onPressRow={(project) => router.push(`/projects/${project.id}` as never)} searchPlaceholder="Tìm mã, tên hoặc địa chỉ" getSearchText={(project) => `${project.code} ${project.name} ${project.address ?? ""}`} filters={[{ key: "status", label: "Tất cả trạng thái", options: statuses.map((value) => ({ value, label: value })), matches: (project, value) => project.status === value }]} columns={[
  { key: "code", label: "Mã", width: 92, render: (project) => <Text variant="labelMedium">{project.code}</Text> },
  { key: "name", label: "Công trình", width: 190, render: (project) => project.name },
  { key: "address", label: "Địa chỉ", width: 210, render: (project) => project.address || "—" },
  { key: "status", label: "Trạng thái", width: 132, render: (project) => project.status },
]}/> : <Empty>Chưa có công trình nào.</Empty>}</StateView></Screen>; }

import { Chip } from "@/components/ui";
import { statusLabels } from "@/lib/format";
import { statusColors } from "@/theme";

export function StatusChip({ status }: { status: keyof typeof statusLabels }) {
  const c = statusColors[status] ?? statusColors.pending;
  return <Chip compact style={{ alignSelf: "flex-start", backgroundColor: c.bg }} labelStyle={{ color: c.fg }}>
    ● {statusLabels[status]}
  </Chip>;
}

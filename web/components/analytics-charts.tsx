"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { money } from "@/lib/format";

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Chờ nhận hàng",
  delivered: "Đã nhận hàng",
  rejected: "Từ chối",
};

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "var(--chart-3)" },
  approved: { label: "Chờ nhận hàng", color: "var(--chart-1)" },
  delivered: { label: "Đã nhận hàng", color: "var(--chart-2)" },
  rejected: { label: "Từ chối", color: "var(--chart-5)" },
} satisfies ChartConfig;

const financeConfig = {
  budget: { label: "Dự toán", color: "var(--chart-1)" },
  actual: { label: "Thực tế", color: "var(--chart-2)" },
} satisfies ChartConfig;

const materialConfig = {
  amount: { label: "Chi phí", color: "var(--chart-1)" },
} satisfies ChartConfig;

const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function EmptyChart() {
  return <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị biểu đồ.</div>;
}

export function OrderStatusChart({ rows, title = "Trạng thái đơn hàng" }: { rows: { status: string; value: number }[]; title?: string }) {
  const data = rows.filter((row) => row.value > 0).map((row) => ({ ...row, label: statusLabels[row.status] ?? row.status, fill: `var(--color-${row.status})` }));
  const total = data.reduce((sum, row) => sum + row.value, 0);

  return <Card className="h-full">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>Phân bố theo trạng thái hiện tại</CardDescription>
    </CardHeader>
    <CardContent>
      {!data.length ? <EmptyChart/> : <>
        <ChartContainer config={statusConfig} className="mx-auto h-56 w-full max-w-md">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="status"/>}/>
            <Pie data={data} dataKey="value" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={3} strokeWidth={0}>
              {data.map((entry) => <Cell key={entry.status} fill={entry.fill}/>) }
            </Pie>
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-semibold tabular-nums">{total}</text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">đơn hàng</text>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {data.map((row) => <span key={row.status} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ backgroundColor: row.fill }}/>{row.label}: <strong className="font-medium tabular-nums text-foreground">{row.value}</strong></span>)}
        </div>
      </>}
    </CardContent>
  </Card>;
}

export function BudgetActualChart({ budget, actual, title = "Dự toán và thực tế" }: { budget: number; actual: number; title?: string }) {
  const data = [{ name: "Giá trị", budget, actual }];
  return <Card className="h-full">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>So sánh tổng giá trị đã lập và đã nhận</CardDescription>
    </CardHeader>
    <CardContent>
      {budget === 0 && actual === 0 ? <EmptyChart/> : <ChartContainer config={financeConfig} className="h-64 w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false}/>
          <XAxis dataKey="name" tickLine={false} axisLine={false}/>
          <YAxis hide/>
          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-40 items-center justify-between gap-4"><span className="text-muted-foreground">{financeConfig[String(name) as keyof typeof financeConfig]?.label}</span><strong className="font-medium tabular-nums">{money(Number(value))}</strong></div>}/>} />
          <ChartLegend content={<ChartLegendContent/>}/>
          <Bar dataKey="budget" fill="var(--color-budget)" radius={[6, 6, 0, 0]}/>
          <Bar dataKey="actual" fill="var(--color-actual)" radius={[6, 6, 0, 0]}/>
        </BarChart>
      </ChartContainer>}
    </CardContent>
  </Card>;
}

export function MaterialComparisonChart({ rows }: { rows: { name: string; budgetAmount: number; actualAmount: number }[] }) {
  const data = [...rows]
    .sort((a, b) => Math.max(b.budgetAmount, b.actualAmount) - Math.max(a.budgetAmount, a.actualAmount))
    .slice(0, 8)
    .map((row) => ({ ...row, budget: row.budgetAmount, actual: row.actualAmount }));
  return <Card>
    <CardHeader>
      <CardTitle>So sánh theo vật tư</CardTitle>
      <CardDescription>8 vật tư có giá trị dự toán hoặc thực tế lớn nhất</CardDescription>
    </CardHeader>
    <CardContent>
      {!data.length ? <EmptyChart/> : <ChartContainer config={financeConfig} className="h-[22rem] w-full">
        <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid horizontal={false}/>
          <XAxis type="number" hide/>
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={110} tickFormatter={(value) => String(value).length > 16 ? `${String(value).slice(0, 15)}…` : String(value)}/>
          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-40 items-center justify-between gap-4"><span className="text-muted-foreground">{financeConfig[String(name) as keyof typeof financeConfig]?.label}</span><strong className="font-medium tabular-nums">{money(Number(value))}</strong></div>}/>} />
          <ChartLegend content={<ChartLegendContent/>}/>
          <Bar dataKey="budget" fill="var(--color-budget)" radius={4}/>
          <Bar dataKey="actual" fill="var(--color-actual)" radius={4}/>
        </BarChart>
      </ChartContainer>}
    </CardContent>
  </Card>;
}

export function GroupCostChart({ rows }: { rows: { name: string; value: number }[] }) {
  const data = [...rows].sort((a, b) => b.value - a.value);
  const config = { value: { label: "Chi phí", color: "var(--chart-1)" } } satisfies ChartConfig;
  const total = data.reduce((sum, row) => sum + row.value, 0);

  return <Card className="h-full">
    <CardHeader>
      <CardTitle>Chi phí theo nhóm vật tư</CardTitle>
      <CardDescription>Tỷ trọng trên tổng chi phí đã nhận</CardDescription>
    </CardHeader>
    <CardContent>
      {!data.length ? <EmptyChart/> : <>
        <ChartContainer config={config} className="mx-auto h-64 w-full max-w-md">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, _name, item) => <div className="flex min-w-44 items-center justify-between gap-4"><span className="text-muted-foreground">{item.payload.name}</span><strong className="font-medium tabular-nums">{money(Number(value))}</strong></div>}/>} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2} strokeWidth={0}>
              {data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]}/>) }
            </Pie>
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-base font-semibold">{money(total)}</text>
            <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">tổng chi phí</text>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {data.map((row, index) => <div key={row.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }}/><span className="truncate">{row.name}</span></span><strong className="font-medium tabular-nums">{total ? Math.round(row.value / total * 100) : 0}%</strong></div>)}
        </div>
      </>}
    </CardContent>
  </Card>;
}

export function MaterialCostChart({ rows }: { rows: { name: string; amount: number }[] }) {
  const data = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 8);
  return <Card>
    <CardHeader>
      <CardTitle>Vật tư có chi phí cao nhất</CardTitle>
      <CardDescription>8 vật tư dẫn đầu trong kỳ đang chọn</CardDescription>
    </CardHeader>
    <CardContent>
      {!data.length ? <EmptyChart/> : <ChartContainer config={materialConfig} className="h-[22rem] w-full">
        <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid horizontal={false}/>
          <XAxis type="number" hide/>
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={110} tickFormatter={(value) => String(value).length > 16 ? `${String(value).slice(0, 15)}…` : String(value)}/>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => <div className="flex min-w-40 items-center justify-between gap-4"><span className="text-muted-foreground">Chi phí</span><strong className="font-medium tabular-nums">{money(Number(value))}</strong></div>}/>} />
          <Bar dataKey="amount" fill="var(--color-amount)" radius={4}/>
        </BarChart>
      </ChartContainer>}
    </CardContent>
  </Card>;
}

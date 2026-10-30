"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type CellContext,
  type HeaderContext,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  ListFilter,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Kiến trúc được điều chỉnh từ sadmann7/tablecn (MIT): TanStack Table,
// toolbar lọc, tùy chỉnh cột, phân trang và action bar khi chọn dòng.
export type DataTableFilterKind = "text" | "select" | "number" | "date";

export type DataTableColumn<T> = {
  id?: string;
  label: string;
  render: (row: T) => React.ReactNode;
  accessor?: (row: T) => unknown;
  filter?: {
    type: DataTableFilterKind;
    options?: { label: string; value: string }[];
  };
  sortable?: boolean;
  hideable?: boolean;
  exportable?: boolean;
};

type FilterOperator =
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

type FilterRule = {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  search?: string;
  searchText?: (row: T) => string;
  empty?: string;
  getRowId?: (row: T, index: number) => string;
};

const operatorLabels: Record<FilterOperator, string> = {
  contains: "chứa",
  not_contains: "không chứa",
  equals: "bằng",
  not_equals: "không bằng",
  starts_with: "bắt đầu bằng",
  ends_with: "kết thúc bằng",
  greater_than: "lớn hơn",
  less_than: "nhỏ hơn",
  is_empty: "đang trống",
  is_not_empty: "không trống",
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("vi");
}

function operatorsFor(type: DataTableFilterKind): FilterOperator[] {
  if (type === "number" || type === "date") {
    return ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"];
  }
  if (type === "select") return ["equals", "not_equals", "is_empty", "is_not_empty"];
  return ["contains", "not_contains", "equals", "not_equals", "starts_with", "ends_with", "is_empty", "is_not_empty"];
}

function matchesRule<T>(row: T, rule: FilterRule, column: DataTableColumn<T>) {
  const raw = column.accessor?.(row);
  const actual = normalize(raw);
  const expected = normalize(rule.value);

  if (rule.operator === "is_empty") return actual.length === 0;
  if (rule.operator === "is_not_empty") return actual.length > 0;

  if (column.filter?.type === "number") {
    const left = Number(raw);
    const right = Number(rule.value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (rule.operator === "greater_than") return left > right;
    if (rule.operator === "less_than") return left < right;
    if (rule.operator === "equals") return left === right;
    if (rule.operator === "not_equals") return left !== right;
  }

  if (column.filter?.type === "date") {
    const left = new Date(String(raw)).getTime();
    const right = new Date(rule.value).getTime();
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (rule.operator === "greater_than") return left > right;
    if (rule.operator === "less_than") return left < right;
    if (rule.operator === "equals") return new Date(left).toDateString() === new Date(right).toDateString();
    if (rule.operator === "not_equals") return new Date(left).toDateString() !== new Date(right).toDateString();
  }

  if (rule.operator === "contains") return actual.includes(expected);
  if (rule.operator === "not_contains") return !actual.includes(expected);
  if (rule.operator === "equals") return actual === expected;
  if (rule.operator === "not_equals") return actual !== expected;
  if (rule.operator === "starts_with") return actual.startsWith(expected);
  if (rule.operator === "ends_with") return actual.endsWith(expected);
  return true;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function DataTable<T>({
  rows,
  columns,
  search,
  searchText,
  empty = "Chưa có dữ liệu.",
  getRowId,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [join, setJoin] = useState<"and" | "or">("and");
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({});

  const normalizedColumns = useMemo(
    () => columns.map((column, index) => ({ ...column, id: column.id ?? `column-${index}` })),
    [columns],
  );
  const filterableColumns = normalizedColumns.filter((column) => column.accessor && column.filter);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (query && searchText && !normalize(searchText(row)).includes(normalize(query))) return false;
      for (const [columnId, value] of Object.entries(quickFilters)) {
        if (!value) continue;
        const column = normalizedColumns.find((item) => item.id === columnId);
        if (!column?.accessor || normalize(column.accessor(row)) !== normalize(value)) return false;
      }
      if (!rules.length) return true;
      const results = rules.map((rule) => {
        const column = normalizedColumns.find((item) => item.id === rule.columnId);
        return column?.accessor ? matchesRule(row, rule, column) : true;
      });
      return join === "and" ? results.every(Boolean) : results.some(Boolean);
    });
  }, [join, normalizedColumns, query, quickFilters, rows, rules, searchText]);

  const tableColumns = useMemo<ColumnDef<T>[]>(() => [
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Chọn tất cả dòng trên trang"
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Chọn dòng"
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        />
      ),
    },
    ...normalizedColumns.map((column) => ({
      id: column.id,
      accessorFn: column.accessor ?? (() => ""),
      enableSorting: column.sortable ?? Boolean(column.accessor),
      enableHiding: column.hideable ?? true,
      header: ({ column: tableColumn }: HeaderContext<T, unknown>) => {
        if (!tableColumn.getCanSort()) return column.label;
        const direction = tableColumn.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={tableColumn.getToggleSortingHandler()}
          >
            {column.label}
            {direction === "asc" ? <ArrowUp /> : direction === "desc" ? <ArrowDown /> : <ArrowUpDown className="text-muted-foreground" />}
          </Button>
        );
      },
      cell: ({ row }: CellContext<T, unknown>) => column.render(row.original),
    })),
  ], [normalizedColumns]);

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row, index) => getRowId?.(row, index) ?? String((row as { id?: string | number }).id ?? index),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  function addRule() {
    const first = filterableColumns[0];
    if (!first) return;
    setRules((current) => [...current, { id: crypto.randomUUID(), columnId: first.id, operator: operatorsFor(first.filter!.type)[0], value: "" }]);
    table.setPageIndex(0);
  }

  function updateRule(id: string, patch: Partial<FilterRule>) {
    setRules((current) => current.map((rule) => {
      if (rule.id !== id) return rule;
      const next = { ...rule, ...patch };
      if (patch.columnId) {
        const column = filterableColumns.find((item) => item.id === patch.columnId);
        next.operator = column ? operatorsFor(column.filter!.type)[0] : "contains";
        next.value = "";
      }
      return next;
    }));
    table.setPageIndex(0);
  }

  function resetFilters() {
    setQuery("");
    setRules([]);
    setQuickFilters({});
    table.setPageIndex(0);
  }

  function exportCsv() {
    const exportColumns = normalizedColumns.filter((column) => column.accessor && column.exportable !== false);
    const visibleIds = new Set(table.getVisibleLeafColumns().map((column) => column.id));
    const activeColumns = exportColumns.filter((column) => visibleIds.has(column.id));
    const exportRows = table.getPrePaginationRowModel().rows;
    const csv = [
      activeColumns.map((column) => csvCell(column.label)).join(","),
      ...exportRows.map((row) => activeColumns.map((column) => csvCell(column.accessor?.(row.original))).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `du-lieu-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const activeFilterCount = rules.length + Object.values(quickFilters).filter(Boolean).length + (query ? 1 : 0);
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {search && (
            <Input
              className="min-w-56 flex-1 sm:max-w-xs"
              aria-label={search}
              placeholder={search}
              value={query}
              onChange={(event) => { setQuery(event.target.value); table.setPageIndex(0); }}
            />
          )}
          {filterableColumns.filter((column) => column.filter?.type === "select").slice(0, 2).map((column) => {
            const options = column.filter?.options ?? Array.from(new Set(rows.map((row) => String(column.accessor?.(row) ?? "")).filter(Boolean))).sort().map((value) => ({ label: value, value }));
            return (
              <Select
                key={column.id}
                value={quickFilters[column.id] || "__all"}
                onValueChange={(value) => {
                  setQuickFilters((current) => ({ ...current, [column.id]: value === "__all" || value == null ? "" : value }));
                  table.setPageIndex(0);
                }}
              >
                <SelectTrigger className="max-w-48"><ListFilter /><SelectValue>{quickFilters[column.id] ? options.find((item) => item.value === quickFilters[column.id])?.label : column.label}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tất cả {column.label.toLocaleLowerCase("vi")}</SelectItem>
                  {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            );
          })}
          {filterableColumns.length > 0 && (
            <Dialog>
              <DialogTrigger render={<Button variant="outline"/>}><Filter />Bộ lọc{rules.length > 0 && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{rules.length}</span>}</DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Bộ lọc nâng cao</DialogTitle>
                  <DialogDescription>Kết hợp nhiều điều kiện như Notion hoặc Airtable.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {rules.length > 1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>Khớp</span>
                      <Select value={join} onValueChange={(value) => value && setJoin(value as "and" | "or")}>
                        <SelectTrigger><SelectValue>{join === "and" ? "tất cả điều kiện" : "bất kỳ điều kiện"}</SelectValue></SelectTrigger>
                        <SelectContent><SelectItem value="and">Tất cả điều kiện</SelectItem><SelectItem value="or">Bất kỳ điều kiện</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  {rules.map((rule) => {
                    const column = filterableColumns.find((item) => item.id === rule.columnId) ?? filterableColumns[0];
                    const needsValue = rule.operator !== "is_empty" && rule.operator !== "is_not_empty";
                    return (
                      <div key={rule.id} className="grid gap-2 rounded-lg bg-muted/50 p-2 sm:grid-cols-[1fr_1fr_1.25fr_auto]">
                        <Select value={rule.columnId} onValueChange={(value) => value && updateRule(rule.id, { columnId: value })}>
                          <SelectTrigger className="w-full"><SelectValue>{column.label}</SelectValue></SelectTrigger>
                          <SelectContent>{filterableColumns.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={rule.operator} onValueChange={(value) => value && updateRule(rule.id, { operator: value as FilterOperator })}>
                          <SelectTrigger className="w-full"><SelectValue>{operatorLabels[rule.operator]}</SelectValue></SelectTrigger>
                          <SelectContent>{operatorsFor(column.filter!.type).map((operator) => <SelectItem key={operator} value={operator}>{operatorLabels[operator]}</SelectItem>)}</SelectContent>
                        </Select>
                        {needsValue ? column.filter?.type === "select" ? (
                          <Select value={rule.value || "__choose"} onValueChange={(value) => value && updateRule(rule.id, { value: value === "__choose" ? "" : value })}>
                            <SelectTrigger className="w-full"><SelectValue>{rule.value || "Chọn giá trị"}</SelectValue></SelectTrigger>
                            <SelectContent><SelectItem value="__choose">Chọn giá trị</SelectItem>{(column.filter.options ?? Array.from(new Set(rows.map((row) => String(column.accessor?.(row) ?? "")).filter(Boolean))).map((value) => ({ label: value, value }))).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input type={column.filter?.type === "number" ? "number" : column.filter?.type === "date" ? "date" : "text"} value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })} placeholder="Giá trị" />
                        ) : <div className="hidden sm:block" />}
                        <Button variant="ghost" size="icon" aria-label="Xóa điều kiện" onClick={() => { setRules((current) => current.filter((item) => item.id !== rule.id)); table.setPageIndex(0); }}><X /></Button>
                      </div>
                    );
                  })}
                  {!rules.length && <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">Chưa có điều kiện lọc.</p>}
                  <Button variant="outline" onClick={addRule}><Filter />Thêm điều kiện</Button>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => { setRules([]); table.setPageIndex(0); }}>Xóa điều kiện</Button><DialogClose render={<Button/>}>Áp dụng</DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {activeFilterCount > 0 && <Button variant="ghost" onClick={resetFilters}><RotateCcw />Đặt lại</Button>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Xuất CSV" title="Xuất CSV" onClick={exportCsv}><Download /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Tùy chỉnh cột" title="Tùy chỉnh cột"/>}><Settings2 /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel><DropdownMenuSeparator />
              {table.getAllLeafColumns().filter((column) => column.id !== "select" && column.getCanHide()).map((column) => {
                const definition = normalizedColumns.find((item) => item.id === column.id);
                return <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}>{definition?.label ?? column.id}</DropdownMenuCheckboxItem>;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="py-12 text-center text-muted-foreground">{activeFilterCount ? "Không tìm thấy kết quả phù hợp." : empty}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <p role="status" className="text-sm text-muted-foreground">{selectedCount ? `${selectedCount} dòng đã chọn` : `${filteredRows.length} dòng`}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Số dòng</span>
          <Select value={String(table.getState().pagination.pageSize)} onValueChange={(value) => value && table.setPageSize(Number(value))}>
            <SelectTrigger><SelectValue>{table.getState().pagination.pageSize}</SelectValue></SelectTrigger>
            <SelectContent>{[10, 20, 30, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
          </Select>
          <span className="min-w-24 text-center text-sm">Trang {table.getState().pagination.pageIndex + 1}/{pageCount}</span>
          <Button variant="outline" size="icon" className="hidden sm:inline-flex" aria-label="Trang đầu" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft /></Button>
          <Button variant="outline" size="icon" aria-label="Trang trước" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" aria-label="Trang sau" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight /></Button>
          <Button variant="outline" size="icon" className="hidden sm:inline-flex" aria-label="Trang cuối" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}><ChevronsRight /></Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-xl bg-foreground px-3 py-2 text-background shadow-lg">
          <span className="text-sm font-medium">Đã chọn {selectedCount} dòng</span>
          <Button variant="secondary" size="sm" onClick={() => table.resetRowSelection()}>Bỏ chọn</Button>
        </div>
      )}
    </div>
  );
}

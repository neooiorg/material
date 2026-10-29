import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppIcon, Button, Card, Searchbar, Text, TruncatedText } from "@/components/ui";
import { SelectMenu } from "@/components/select-menu";
import { colors, fonts, radius, spacing } from "@/theme";

export type DataTableColumn<Row> = {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  render: (row: Row) => ReactNode;
};

export type DataTableFilter<Row> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  matches: (row: Row, value: string) => boolean;
};

type DataTableProps<Row extends { id: string | number }> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  onPressRow?: (row: Row) => void;
  filters?: DataTableFilter<Row>[];
  getSearchText?: (row: Row) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
};

/** Native-friendly operational table: search, filters, horizontal columns and paging. */
export function DataTable<Row extends { id: string | number }>({
  columns,
  rows,
  onPressRow,
  filters = [],
  getSearchText,
  searchPlaceholder = "Tìm trong danh sách",
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
}: DataTableProps<Row>) {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const lastRowPress = useRef<{ id: Row["id"]; at: number } | null>(null);
  const searchValue = search.trim().toLocaleLowerCase("vi-VN");

  const normalizedPageSizeOptions = useMemo(() => {
    const options = [...new Set([pageSize, ...pageSizeOptions])].filter((value) => value > 0);
    return options.sort((a, b) => a - b);
  }, [pageSize, pageSizeOptions]);

  const searchable = useMemo(
    () =>
      rows.filter((row) => {
        const text = (
          getSearchText?.(row) ??
          Object.values(row)
            .filter((value) => typeof value === "string" || typeof value === "number")
            .join(" ")
        ).toLocaleLowerCase("vi-VN");

        return (
          (!searchValue || text.includes(searchValue)) &&
          filters.every((filter) => {
            const value = activeFilters[filter.key] ?? "all";
            return value === "all" || filter.matches(row, value);
          })
        );
      }),
    [activeFilters, filters, getSearchText, rows, searchValue],
  );

  const pageCount = Math.max(1, Math.ceil(searchable.length / currentPageSize));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * currentPageSize;
  const endIndex = Math.min(startIndex + currentPageSize, searchable.length);
  const pageRows = searchable.slice(startIndex, endIndex);
  const minWidth = columns.reduce((total, column) => total + (column.width ?? 150), 0);

  function openRow(row: Row) {
    if (!onPressRow) return;
    if (lastRowPress.current?.id === row.id && Date.now() - lastRowPress.current.at < 1_000) return;
    lastRowPress.current = { id: row.id, at: Date.now() };
    onPressRow(row);
  }

  useEffect(() => {
    setPage(0);
  }, [search, activeFilters, rows.length, currentPageSize]);

  useEffect(() => {
    setCurrentPageSize(pageSize);
  }, [pageSize]);

  return (
    <View style={{ gap: spacing.sm }}>
      <Searchbar placeholder={searchPlaceholder} value={search} onChangeText={setSearch} />

      {filters.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {filters.map((filter) => (
            <View key={filter.key} style={{ minWidth: 164, flex: 1 }}>
              <SelectMenu
                label={filter.label}
                value={activeFilters[filter.key] ?? "all"}
                onChange={(value) => setActiveFilters((current) => ({ ...current, [filter.key]: value }))}
                options={[{ value: "all", label: filter.label }, ...filter.options]}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Card style={{ overflow: "hidden", borderRadius: radius.lg }}>
        <ScrollView horizontal nestedScrollEnabled keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator contentContainerStyle={{ minWidth }}>
          <View style={{ flex: 1 }}>
            <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceMuted, borderBottomWidth: 1, borderColor: colors.border }}>
              {columns.map((column) => (
                <View key={column.key} style={{ width: column.width ?? 150, paddingHorizontal: spacing.md, alignItems: alignItems(column.align), overflow: "hidden" }}>
                  <TruncatedText title={column.label} variant="labelSmall" style={{ color: colors.textSecondary }}>
                    {column.label}
                  </TruncatedText>
                </View>
              ))}
            </View>

            {pageRows.map((row, index) => {
              const rowContent = columns.map((column) => {
                const content = column.render(row);
                const navigates = !!onPressRow && column.key !== "actions";
                const cellStyle = {
                  width: column.width ?? 150,
                  minHeight: 56,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  alignSelf: "stretch" as const,
                  alignItems: alignItems(column.align),
                  justifyContent: "center" as const,
                  overflow: "hidden" as const,
                };
                const cellContent = typeof content === "string" || typeof content === "number" ? (
                      <TruncatedText title={column.label} lines={2} style={{ color: colors.text, fontFamily: fonts.regular }}>
                        {content}
                      </TruncatedText>
                    ) : (
                      content
                    );
                return navigates ? (
                  <Pressable
                    key={column.key}
                    accessibilityRole="button"
                    onPress={() => openRow(row)}
                    style={({ pressed }) => [cellStyle, { backgroundColor: pressed ? colors.primaryContainer : colors.surface }]}
                  >
                    {cellContent}
                  </Pressable>
                ) : <View key={column.key} style={cellStyle}>{cellContent}</View>;
              });
              const rowStyle = {
                minHeight: 56,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                backgroundColor: colors.surface,
                borderBottomWidth: index === pageRows.length - 1 ? 0 : 1,
                borderColor: colors.border,
              };

              // Action cells are siblings of navigation cells, so their buttons
              // never compete with an ancestor row press gesture.
              return <View key={row.id} style={rowStyle}>{rowContent}</View>;
            })}
          </View>
        </ScrollView>

        {pageRows.length === 0 ? (
          <View style={{ padding: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
              <AppIcon name="search" color={colors.textSecondary} size={20} />
            </View>
            <Text variant="labelMedium" selectable={false}>Không tìm thấy dữ liệu</Text>
            <Text selectable={false} style={{ color: colors.textSecondary, textAlign: "center" }}>Thử đổi từ khóa tìm kiếm hoặc bộ lọc.</Text>
          </View>
        ) : null}
      </Card>

      {searchable.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" }}>
            <Text selectable={false} variant="labelSmall" style={{ color: colors.textSecondary, flexGrow: 1 }}>
              Hiển thị {startIndex + 1}-{endIndex} / {searchable.length}
            </Text>
            <View style={{ minWidth: 132 }}>
              <SelectMenu
                label="Dòng / trang"
                value={String(currentPageSize)}
                onChange={(value) => setCurrentPageSize(Number(value))}
                options={normalizedPageSizeOptions.map((value) => ({ value: String(value), label: `${value} dòng` }))}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.sm }}>
            <Button compact mode="outlined" disabled={safePage === 0} onPress={() => setPage((current) => Math.max(0, current - 1))}>
              Trước
            </Button>
            <Text selectable={false} variant="labelSmall" style={{ color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
              Trang {safePage + 1}/{pageCount}
            </Text>
            <Button compact mode="outlined" disabled={safePage >= pageCount - 1} onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>
              Sau
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function alignItems(align?: "left" | "right" | "center"): "flex-start" | "flex-end" | "center" {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

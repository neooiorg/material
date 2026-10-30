"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SearchableOption = { value: string; label: string };

const itemClass = "relative flex min-h-10 w-full cursor-default items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

function Popup({ children }: { children: React.ReactNode }) {
  return <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner side="bottom" sideOffset={6} align="start" className="isolate z-50">
      <ComboboxPrimitive.Popup className="w-(--anchor-width) min-w-64 max-w-(--available-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
        {children}
      </ComboboxPrimitive.Popup>
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>;
}

export function SearchableSelect({ label, value, onChange, options, required = false, placeholder = "Chọn giá trị" }: { label: string; value: string; onChange: (value: string) => void; options: SearchableOption[]; required?: boolean; placeholder?: string }) {
  const selected = options.find((option) => option.value === value) ?? null;
  return <div className="space-y-1.5">
    <Label>{label}</Label>
    <ComboboxPrimitive.Root required={required} items={options} value={selected} onValueChange={(option) => onChange(option?.value ?? "")} itemToStringLabel={(option: SearchableOption) => option.label} itemToStringValue={(option: SearchableOption) => option.value}>
      <ComboboxPrimitive.Trigger aria-label={label} render={<Button type="button" variant="outline" className={cn("h-11 w-full justify-between px-3 font-normal sm:h-9", !selected && "text-muted-foreground")}/>}>
        <span className="truncate">{selected?.label ?? placeholder}</span><ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden="true"/>
      </ComboboxPrimitive.Trigger>
      <Popup>
        <div className="relative border-b p-2"><Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/><ComboboxPrimitive.Input render={<Input className="pl-9"/>} placeholder={`Tìm ${label.toLocaleLowerCase("vi")}…`}/></div>
        <ComboboxPrimitive.Empty className="p-6 text-center text-sm text-muted-foreground">Không tìm thấy kết quả.</ComboboxPrimitive.Empty>
        <ComboboxPrimitive.List className="max-h-72 overflow-y-auto p-1">
          {(option: SearchableOption) => <ComboboxPrimitive.Item key={option.value || "__empty"} value={option} className={itemClass}>{option.label}<ComboboxPrimitive.ItemIndicator className="absolute right-3"><Check className="size-4" aria-hidden="true"/></ComboboxPrimitive.ItemIndicator></ComboboxPrimitive.Item>}
        </ComboboxPrimitive.List>
      </Popup>
    </ComboboxPrimitive.Root>
  </div>;
}

export function SearchableMultiSelect({ label, values, onChange, options, placeholder = "Chọn một hoặc nhiều giá trị" }: { label: string; values: string[]; onChange: (values: string[]) => void; options: SearchableOption[]; placeholder?: string }) {
  const selected = options.filter((option) => values.includes(option.value));
  return <div className="space-y-1.5">
    <Label>{label}</Label>
    <ComboboxPrimitive.Root multiple items={options} value={selected} onValueChange={(next) => onChange(next.map((option) => option.value))} itemToStringLabel={(option: SearchableOption) => option.label} itemToStringValue={(option: SearchableOption) => option.value}>
      <ComboboxPrimitive.Trigger aria-label={label} render={<Button type="button" variant="outline" className={cn("h-11 w-full justify-between px-3 font-normal sm:h-9", !selected.length && "text-muted-foreground")}/>}>
        <span className="truncate">{selected.length ? selected.length === 1 ? selected[0].label : `Đã chọn ${selected.length} mục` : placeholder}</span><ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden="true"/>
      </ComboboxPrimitive.Trigger>
      <Popup>
        <div className="relative border-b p-2"><Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/><ComboboxPrimitive.Input render={<Input className="pl-9"/>} placeholder={`Tìm ${label.toLocaleLowerCase("vi")}…`}/></div>
        <ComboboxPrimitive.Empty className="p-6 text-center text-sm text-muted-foreground">Không tìm thấy kết quả.</ComboboxPrimitive.Empty>
        <ComboboxPrimitive.List className="max-h-72 overflow-y-auto p-1">
          {(option: SearchableOption) => <ComboboxPrimitive.Item key={option.value} value={option} className={itemClass}>{option.label}<ComboboxPrimitive.ItemIndicator className="absolute right-3"><Check className="size-4" aria-hidden="true"/></ComboboxPrimitive.ItemIndicator></ComboboxPrimitive.Item>}
        </ComboboxPrimitive.List>
      </Popup>
    </ComboboxPrimitive.Root>
    {selected.length > 0 ? <div className="flex flex-wrap gap-1.5 pt-1">{selected.map((option) => <span key={option.value} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{option.label}</span>)}</div> : null}
  </div>;
}

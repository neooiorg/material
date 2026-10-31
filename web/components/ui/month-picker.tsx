"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
]

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number)
  const now = new Date()
  return {
    year: Number.isInteger(year) ? year : now.getFullYear(),
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1,
  }
}

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function MonthPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = React.useId()
  const selected = parseMonth(value)
  const [open, setOpen] = React.useState(false)
  const [visibleYear, setVisibleYear] = React.useState(selected.year)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) setVisibleYear(selected.year)
  }

  function selectMonth(month: number) {
    onChange(monthValue(visibleYear, month))
    setOpen(false)
  }

  function selectCurrentMonth() {
    const now = new Date()
    onChange(monthValue(now.getFullYear(), now.getMonth() + 1))
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="h-11 w-full justify-between px-3 font-normal sm:h-9"
            />
          }
        >
          <span>{MONTH_NAMES[selected.month - 1]}/{selected.year}</span>
          <CalendarDays className="text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Xem năm trước"
              onClick={() => setVisibleYear((year) => year - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <strong className="text-sm font-semibold tabular-nums">Năm {visibleYear}</strong>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Xem năm sau"
              onClick={() => setVisibleYear((year) => year + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1" role="grid" aria-label={`Chọn tháng trong năm ${visibleYear}`}>
            {MONTH_NAMES.map((name, index) => {
              const month = index + 1
              const isSelected = selected.year === visibleYear && selected.month === month
              return (
                <Button
                  key={month}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  className="justify-center"
                  aria-pressed={isSelected}
                  onClick={() => selectMonth(month)}
                >
                  {name}
                </Button>
              )
            })}
          </div>
          <div className="border-t pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={selectCurrentMonth}>
              Chọn tháng hiện tại
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

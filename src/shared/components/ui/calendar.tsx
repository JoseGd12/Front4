"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleDateString("es", { weekday: "narrow" }).toUpperCase(),
      }}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        caption: "flex justify-between items-center pt-1 px-1 w-full",
        caption_label: "text-[11px] font-semibold uppercase tracking-wide",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-70 hover:opacity-100 cursor-pointer",
        nav_button_previous: "",
        nav_button_next: "",
        table: "border-collapse",
        head_row: "flex gap-1.5",
        head_cell:
          "inline-flex items-center justify-center size-9 shrink-0 text-muted-foreground font-normal text-[11px] uppercase",
        row: "flex mt-1.5 gap-1.5",
        cell: cn(
          "relative inline-flex items-center justify-center shrink-0 p-0 focus-within:relative focus-within:z-20 size-9",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "",
        ),
        day: "inline-flex items-center justify-center size-9 p-0 text-[11px] font-normal rounded-full hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100 cursor-pointer transition-colors",
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        day_today: "bg-accent text-accent-foreground rounded-full font-medium",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-3.5", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-3.5", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };

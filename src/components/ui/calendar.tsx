import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 sm:p-3 md:p-4 w-full", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-3 sm:space-y-4 w-full",
        caption: "flex justify-center pt-1 pb-2 sm:pb-3 relative items-center w-full",
        caption_label: "text-base sm:text-lg font-semibold text-slate-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 sm:h-9 sm:w-9 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-teal-50 hover:border-teal-300 transition-all",
        ),
        nav_button_previous: "absolute left-0 sm:left-1",
        nav_button_next: "absolute right-0 sm:right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between mb-1 sm:mb-2",
        head_cell: "text-muted-foreground rounded-lg w-full sm:w-10 font-semibold text-xs sm:text-sm py-2 sm:py-0",
        row: "flex w-full mt-1 sm:mt-2 justify-between gap-1 sm:gap-0",
        cell: "h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-center text-sm sm:text-base p-0 relative flex-1 sm:flex-none [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 p-0 font-medium text-sm sm:text-base rounded-lg sm:rounded-md aria-selected:opacity-100 transition-all duration-200 active:scale-95 touch-manipulation"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 focus:from-teal-700 focus:to-teal-800 shadow-md shadow-teal-600/20 font-bold",
        day_today: "bg-teal-50 text-teal-700 font-bold border-2 border-teal-300",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-teal-50 aria-selected:text-teal-700",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

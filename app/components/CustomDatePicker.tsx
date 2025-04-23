"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DatepickerProps } from "../lib/types/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import es from "date-fns/locale/es";

const CustomDatePicker: React.FC<DatepickerProps> = ({
  value,
  onChange,
  error,
  isClearable = false,
  label = "Fecha de vencimiento",
  placeholderText = "Seleccionar fecha de vencimiento...",
}) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      try {
        const [year, month, day] = value.split("-").map(Number);
        const localDate = new Date(year, month - 1, day);
        setDate(localDate);
      } catch (error) {
        console.error("Error parsing date:", error);
        setDate(undefined);
      }
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleDateChange = (selectedDate?: Date) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");

      setDate(selectedDate);
      onChange(`${year}-${month}-${day}`);
    } else {
      setDate(undefined);
      onChange(undefined);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDateChange(undefined);
  };

  return (
    <div className="flex flex-col w-full gap-1 mt-1">
      {label && (
        <label className="block text-sm font-medium leading-none text-gray_m dark:text-white">
          {label}
        </label>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "PPP", { locale: es })
            ) : (
              <span>{placeholderText}</span>
            )}
            {isClearable && date && (
              <X
                className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
            fromDate={new Date()}
            locale={es}
            classNames={{
              day_selected: "bg-primary text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
            }}
          />
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default CustomDatePicker;

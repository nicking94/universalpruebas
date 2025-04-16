import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { Calendar } from "lucide-react";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string;
  isClearable?: boolean;
}

const CustomDatePicker: React.FC<Props> = ({
  value,
  onChange,
  error,
  isClearable = false,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);

  useEffect(() => {
    if (value) {
      try {
        const parsedDate = parseISO(value);
        setStartDate(parsedDate);
      } catch (error) {
        console.error("Error parsing date:", error);
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
  }, [value]);

  const handleDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      onChange(formattedDate);
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="datepicker"
        className="block text-gray_m dark:text-white text-sm font-semibold mb-1"
      >
        Fecha de vencimiento
      </label>
      <div className="relative w-full">
        <DatePicker
          id="datepicker"
          selected={startDate}
          onChange={handleDateChange}
          dateFormat="dd-MM-yyyy"
          locale={es}
          placeholderText="Seleccionar fecha de vencimiento..."
          className="pl-10 border border-gray_xl focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m w-full bg-white p-2 rounded-sm placeholder:text-gray_l outline-none text-gray_b"
          wrapperClassName="w-full"
          isClearable={isClearable}
          clearButtonClassName="text-gray-500 hover:text-red-500"
        />
        {!startDate && (
          <Calendar
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const datepickerElement = document.querySelector("#datepicker");
              if (datepickerElement instanceof HTMLInputElement) {
                datepickerElement.focus();
              } else if (datepickerElement instanceof HTMLElement) {
                (datepickerElement as HTMLInputElement).focus();
              }
            }}
          />
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default CustomDatePicker;

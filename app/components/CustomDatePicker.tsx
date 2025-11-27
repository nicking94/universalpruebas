"use client";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import { TextField, IconButton, Box, useTheme } from "@mui/material";
import { parseISO, format, isValid } from "date-fns";
import { useMemo, useState } from "react";
import { PickersActionBarAction } from "@mui/x-date-pickers";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  isClearable?: boolean;
  label?: string;
  placeholder?: string;
  enableAccessibleFieldDOMStructure?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

type DateValidationError =
  | "invalidDate"
  | "disableDate"
  | "disableFuture"
  | "disablePast"
  | "minDate"
  | "maxDate"
  | "shouldDisableDate"
  | "shouldDisableMonth"
  | "shouldDisableYear"
  | null;

const CustomDatePicker = ({
  value,
  onChange,
  isClearable = false,
  placeholder = "Seleccionar fecha",
  enableAccessibleFieldDOMStructure = false,
  minDate,
  maxDate,
  disabled = false,
}: CustomDatePickerProps) => {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const parsedValue = useMemo(() => {
    return value && isValid(parseISO(value)) ? parseISO(value) : null;
  }, [value]);

  const handleChange = (newValue: Date | null) => {
    if (newValue && isValid(newValue)) {
      onChange(format(newValue, "yyyy-MM-dd"));
      setError(null);
    } else {
      onChange("");
    }
    setOpen(false);
  };

  const handleError = (error: DateValidationError) => {
    switch (error) {
      case "invalidDate":
        setError("Fecha inválida");
        break;
      case "minDate":
        setError("La fecha no puede ser anterior a la fecha mínima");
        break;
      case "maxDate":
        setError("La fecha no puede ser posterior a la fecha máxima");
        break;
      case "disableDate":
      case "shouldDisableDate":
        setError("Esta fecha no está disponible");
        break;
      case "disableFuture":
        setError("No se permiten fechas futuras");
        break;
      case "disablePast":
        setError("No se permiten fechas pasadas");
        break;
      default:
        setError(null);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, "dd/MM/yyyy");
      }
    } catch {
      return placeholder;
    }
    return placeholder;
  };

  const slotProps = useMemo(() => {
    const baseProps = {
      textField: {
        size: "small" as const,
        fullWidth: true,
        error: !!error,
        helperText: error,
      },
      actionBar: {
        actions: [] as PickersActionBarAction[],
      },
    };

    if (isClearable) {
      return {
        ...baseProps,
        actionBar: {
          actions: ["clear"] as PickersActionBarAction[],
        },
      };
    }

    return baseProps;
  }, [isClearable, error]);

  const handleIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleTextFieldClick = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  // Configuración de localización en español para MUI DatePicker
  const localeText = {
    clearButtonLabel: "Limpiar",
    todayButtonLabel: "Hoy",
    okButtonLabel: "Aceptar",
    cancelButtonLabel: "Cancelar",
    clear: "Limpiar",
    today: "Hoy",
    ok: "Aceptar",
    cancel: "Cancelar",
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ position: "relative", display: "inline-block" }}>
        {/* Campo de texto con el icono integrado - CORREGIDO para dark mode */}
        <TextField
          value={formatDisplayDate(value)}
          placeholder={placeholder}
          size="small"
          InputProps={{
            readOnly: true,
            sx: {
              cursor: "pointer",
              backgroundColor: theme.palette.background.paper,
              "& .MuiInputBase-input": {
                cursor: "pointer",
                paddingRight: "40px",
                color: theme.palette.text.primary,
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.23)"
                    : "rgba(0, 0, 0, 0.23)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(0, 0, 0, 0.4)",
              },
            },
            endAdornment: (
              <IconButton
                onClick={handleIconClick}
                disabled={disabled}
                sx={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "4px",
                  color: "action.active",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&.Mui-disabled": {
                    color: "action.disabled",
                  },
                }}
                title="Seleccionar fecha"
              >
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            ),
          }}
          onClick={handleTextFieldClick}
          error={!!error}
          helperText={error}
          disabled={disabled}
          sx={{
            minWidth: "150px",
            "& .MuiInputBase-root": {
              cursor: disabled ? "not-allowed" : "pointer",
              paddingRight: "0px",
            },
            "& .MuiFormHelperText-root": {
              color: error
                ? theme.palette.error.main
                : theme.palette.text.secondary,
            },
          }}
        />

        {/* DatePicker oculto que se abre con el icono */}
        <DatePicker
          value={parsedValue}
          onChange={handleChange}
          onError={handleError}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          enableAccessibleFieldDOMStructure={enableAccessibleFieldDOMStructure}
          format="dd/MM/yyyy"
          localeText={localeText}
          slots={{
            textField: () => null,
          }}
          slotProps={{
            ...slotProps,
            popper: {
              placement: "bottom-start",
            },
            actionBar: {
              actions: isClearable ? ["clear"] : [],
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default CustomDatePicker;

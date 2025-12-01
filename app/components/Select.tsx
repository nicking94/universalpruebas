"use client";
import React from "react";
import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  FormHelperText,
  SelectProps as MuiSelectProps,
  SelectChangeEvent,
  useTheme,
  IconButton,
  Box,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import { Delete } from "@mui/icons-material";

// Interfaz genérica para metadata con tipos específicos
export interface SelectOptionMetadata {
  id?: string | number;
  [key: string]: unknown; // Permite propiedades adicionales sin usar 'any'
}

export interface SelectOption<T = string | number, M = SelectOptionMetadata> {
  value: T;
  label: string;
  disabled?: boolean;
  deletable?: boolean;
  metadata?: M; // Metadata tipada
}

export interface SelectProps<T = string | number, M = SelectOptionMetadata>
  extends Omit<MuiSelectProps, "onChange" | "value"> {
  label: string;
  options: SelectOption<T, M>[];
  value: T;
  onChange: (value: T) => void;
  onDeleteOption?: (option: SelectOption<T, M>) => void;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  variant?: "outlined" | "filled" | "standard";
  showDeleteButton?: boolean;
  getOptionId?: (option: SelectOption<T, M>) => string | number | undefined; // Función para obtener ID
}

function Select<T = string | number, M = SelectOptionMetadata>({
  label,
  options,
  value,
  onChange,
  onDeleteOption,
  helperText,
  error = false,
  fullWidth = true,
  size = "small",
  variant = "outlined",
  showDeleteButton = false,
  getOptionId,
  sx,
  ...props
}: SelectProps<T, M>): React.JSX.Element {
  const theme = useTheme();

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    onChange(event.target.value as T);
  };

  const handleDelete = (
    event: React.MouseEvent,
    option: SelectOption<T, M>
  ) => {
    event.stopPropagation();
    if (onDeleteOption) {
      onDeleteOption(option);
    }
  };

  const labelId = `${label}-label`;

  const shouldShowDeleteButton = (option: SelectOption<T, M>) => {
    return showDeleteButton && onDeleteOption && option.deletable !== false;
  };

  // Función para generar una key única para cada opción
  const getOptionKey = (option: SelectOption<T, M>) => {
    if (getOptionId) {
      const id = getOptionId(option);
      if (id !== undefined) return `${id}`;
    }

    // Si la opción tiene metadata con ID, úsalo
    if (
      option.metadata &&
      typeof option.metadata === "object" &&
      "id" in option.metadata
    ) {
      return `${option.metadata.id}`;
    }

    // Si no, usa el valor como fallback
    return String(option.value);
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      variant={variant}
      sx={{
        minWidth: 120,
        ...sx,
      }}
    >
      <InputLabel
        id={labelId}
        sx={{
          color: theme.palette.text.secondary,
          "&.Mui-focused": {
            color: theme.palette.primary.main,
          },
        }}
      >
        {label}
      </InputLabel>
      <MuiSelect
        value={value}
        onChange={handleChange}
        labelId={labelId}
        label={label}
        sx={{
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor:
              theme.palette.mode === "dark"
                ? theme.palette.grey[700]
                : theme.palette.grey[400],
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              "& .MuiMenuItem-root": {
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                },
                "&.Mui-selected:hover": {
                  backgroundColor: theme.palette.action.selected,
                },
              },
            },
          },
        }}
        {...props}
      >
        {options.map((option) => (
          <MenuItem
            key={getOptionKey(option)}
            value={option.value as string | number}
            disabled={option.disabled}
            sx={{
              color: theme.palette.text.primary,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingRight: shouldShowDeleteButton(option) ? "8px" : "16px",
              "& .delete-button": {
                opacity: 0,
                transition: "opacity 0.2s",
              },
              "&:hover .delete-button": {
                opacity: 1,
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
              <ListItemText primary={option.label} />
            </Box>

            {shouldShowDeleteButton(option) && (
              <ListItemIcon sx={{ minWidth: "auto", marginLeft: 1 }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleDelete(e, option)}
                  className="delete-button"
                  sx={{
                    color: theme.palette.error.main,
                    "&:hover": {
                      backgroundColor: theme.palette.error.light,
                      color: theme.palette.error.dark,
                    },
                    padding: "4px",
                  }}
                  title="Eliminar"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && (
        <FormHelperText
          sx={{
            color: error
              ? theme.palette.error.main
              : theme.palette.text.secondary,
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}

export default Select;

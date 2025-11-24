// Select.tsx - Versión mejorada
import React from "react";
import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  FormHelperText,
  SelectProps as MuiSelectProps,
  SelectChangeEvent,
} from "@mui/material";

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T = string | number>
  extends Omit<MuiSelectProps, "onChange" | "value"> {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  variant?: "outlined" | "filled" | "standard";
}

function Select<T = string | number>({
  label,
  options,
  value,
  onChange,
  helperText,
  error = false,
  fullWidth = true,
  size = "small",
  variant = "outlined",
  ...props
}: SelectProps<T>): React.JSX.Element {
  const handleChange = (event: SelectChangeEvent<unknown>) => {
    onChange(event.target.value as T);
  };

  const labelId = `${label}-label`;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      variant={variant}
      sx={{ minWidth: 120 }}
    >
      <InputLabel id={labelId}>{label}</InputLabel>
      <MuiSelect
        value={value}
        onChange={handleChange}
        labelId={labelId}
        label={label}
        {...props}
      >
        {options.map((option) => (
          <MenuItem
            key={String(option.value)}
            value={option.value as string | number}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}

export default Select;

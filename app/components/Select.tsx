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
  sx,
  ...props
}: SelectProps<T>): React.JSX.Element {
  const theme = useTheme();

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
            key={String(option.value)}
            value={option.value as string | number}
            disabled={option.disabled}
            sx={{
              color: theme.palette.text.primary,
            }}
          >
            {option.label}
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

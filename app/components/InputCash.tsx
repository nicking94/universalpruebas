"use client";
import React from "react";
import {
  TextField,
  InputAdornment,
  FormControl,
  useTheme,
} from "@mui/material";
import { AttachMoney } from "@mui/icons-material";

interface InputCashProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const InputCash: React.FC<InputCashProps> = ({
  value,
  onChange,
  label,
  placeholder = "$0,00",
  disabled = false,
}) => {
  const theme = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    if (rawValue === "") {
      onChange(0);
      return;
    }

    // Solo números y punto decimal
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        onChange(numericValue);
      }
    }
  };

  return (
    <FormControl fullWidth variant="outlined">
      <TextField
        value={value === 0 ? "" : value.toString()}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        label={label}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AttachMoney />
            </InputAdornment>
          ),
          sx: {
            backgroundColor: theme.palette.background.paper,
            "& .MuiOutlinedInput-input": {
              color: theme.palette.text.primary,
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.text.secondary,
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
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
        variant="outlined"
        size="small"
        fullWidth
      />
    </FormControl>
  );
};

export default InputCash;

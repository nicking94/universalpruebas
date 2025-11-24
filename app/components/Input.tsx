"use client";
import React, { useState } from "react";
import {
  TextField,
  InputAdornment,
  FormControl,
  IconButton,
} from "@mui/material";

interface InputProps {
  label?: string;
  colorLabel?: string;
  type?: string;
  name?: string;
  value?: string | number;
  readOnly?: boolean;
  onChange?: (value: string | number) => void;
  onRawChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  accept?: string;
  autoFocus?: boolean;
  ref?: React.Ref<HTMLInputElement>;
  border?: string;
  textPosition?: string;
  icon?: React.ReactNode;
  width?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  multiline?: boolean;
  rows?: number;
  // Nuevas props para el botón integrado
  buttonIcon?: React.ReactNode;
  onButtonClick?: () => void;
  buttonTitle?: string;
  buttonDisabled?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  name,
  value,
  readOnly = false,
  onChange = () => {},
  onRawChange,
  placeholder,
  accept,
  autoFocus = false,
  ref,
  icon,
  width = "100%",
  onKeyDown,
  onBlur,
  required = false,
  disabled = false,
  step,
  multiline = false,
  rows = 1,
  // Nuevas props para el botón integrado
  buttonIcon,
  onButtonClick,
  buttonTitle,
  buttonDisabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRawChange?.(e);

    if (type === "number") {
      onChange(e.target.value === "" ? 0 : Number(e.target.value));
    } else {
      onChange(e.target.value);
    }
  };

  const shouldShrink =
    isFocused || (value !== undefined && value !== "" && value !== 0);

  return (
    <FormControl fullWidth sx={{ width }} variant="outlined">
      <TextField
        ref={ref}
        autoFocus={autoFocus}
        type={type}
        name={name}
        value={value}
        onChange={readOnly ? undefined : handleChange}
        onKeyDown={onKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        InputProps={{
          readOnly: readOnly,
          startAdornment: icon ? (
            <InputAdornment position="start">{icon}</InputAdornment>
          ) : undefined,
          endAdornment:
            buttonIcon && onButtonClick ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={onButtonClick}
                  disabled={buttonDisabled || disabled}
                  size="medium"
                  title={buttonTitle}
                  sx={{
                    marginRight: "8px",
                    padding: "4px",
                    borderRadius: "4px",
                    backgroundColor: "primary.main",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "grey.400",
                      color: "grey.600",
                    },
                  }}
                >
                  {buttonIcon}
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
        placeholder={placeholder}
        inputProps={{
          accept,
          step,
        }}
        label={label}
        required={required}
        disabled={disabled}
        variant="outlined"
        size="small"
        fullWidth
        multiline={multiline}
        rows={rows}
        InputLabelProps={{
          shrink: shouldShrink,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
            "&:hover fieldset": { borderColor: "#3b82f6" },
            "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
            // Ajustar padding cuando hay botón
            paddingRight: buttonIcon ? "0px" : undefined,
          },
          "& .MuiInputLabel-root": {
            "&.Mui-focused": { color: "#3b82f6" },
            "&.MuiInputLabel-shrink": {
              transform: "translate(14px, -6px) scale(0.75)",
            },
          },
          "& .MuiOutlinedInput-input": {
            paddingLeft: icon ? "8px" : undefined,
          },
        }}
      />
    </FormControl>
  );
};

export default Input;

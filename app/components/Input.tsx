"use client";
import React, { useState } from "react";
import {
  TextField,
  InputAdornment,
  FormControl,
  IconButton,
  TextFieldProps,
  useTheme,
} from "@mui/material";

export interface InputProps
  extends Omit<
    TextFieldProps,
    "onChange" | "variant" | "InputLabelProps" | "InputProps" | "sx"
  > {
  label?: string;
  type?: string;
  value?: string | number;
  readOnly?: boolean;
  onChange?: (value: string | number) => void;
  onRawChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  width?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  accept?: string;
  multiline?: boolean;
  rows?: number;
  buttonIcon?: React.ReactNode;
  onButtonClick?: () => void;
  buttonTitle?: string;
  buttonDisabled?: boolean;
  customSx?: TextFieldProps["sx"];
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
  buttonIcon,
  onButtonClick,
  buttonTitle,
  buttonDisabled = false,
  size = "small",
  fullWidth = true,
  error,
  helperText,
  select,
  children,
  customSx,
  ...textFieldProps
}) => {
  const theme = useTheme();
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
      const numValue = e.target.value === "" ? 0 : Number(e.target.value);
      onChange(numValue);
    } else {
      onChange(e.target.value);
    }
  };

  const shouldShrink =
    isFocused || (value !== undefined && value !== "" && value !== 0);

  const inputPropsConfig: TextFieldProps["InputProps"] = {
    readOnly,
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
              backgroundColor: theme.palette.primary.main,
              color: "white",
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
              "&.Mui-disabled": {
                backgroundColor: theme.palette.action.disabled,
                color: theme.palette.text.disabled,
              },
            }}
          >
            {buttonIcon}
          </IconButton>
        </InputAdornment>
      ) : undefined,
  };

  const inputLabelProps: TextFieldProps["InputLabelProps"] = {
    shrink: shouldShrink,
    sx: {
      color: theme.palette.text.secondary,
      "&.Mui-focused": {
        color: theme.palette.primary.main,
      },
    },
  };

  const inputPropsConfigInternal: TextFieldProps["inputProps"] = {
    accept,
    step,
  };

  const sxStyles: TextFieldProps["sx"] = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      "& fieldset": {
        borderColor:
          theme.palette.mode === "dark"
            ? theme.palette.grey[700]
            : theme.palette.grey[400],
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
      },
      paddingRight: buttonIcon ? "0px" : undefined,
    },
    "& .MuiInputLabel-root": {
      color: theme.palette.text.secondary,
      "&.Mui-focused": {
        color: theme.palette.primary.main,
      },
      "&.MuiInputLabel-shrink": {
        transform: "translate(14px, -6px) scale(0.75)",
      },
    },
    "& .MuiOutlinedInput-input": {
      paddingLeft: icon ? "8px" : undefined,
      color: theme.palette.text.primary,
      "&::placeholder": {
        color: theme.palette.text.secondary,
        opacity: 0.7,
      },
    },
    "& .MuiFormHelperText-root": {
      color: error ? theme.palette.error.main : theme.palette.text.secondary,
    },
    width,
    ...customSx,
  };

  return (
    <FormControl fullWidth={fullWidth} sx={{ width }} variant="outlined">
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
        placeholder={placeholder}
        label={label}
        required={required}
        disabled={disabled}
        variant="outlined"
        size={size}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={rows}
        error={error}
        helperText={helperText}
        select={select}
        InputProps={inputPropsConfig}
        InputLabelProps={inputLabelProps}
        inputProps={inputPropsConfigInternal}
        sx={sxStyles}
        {...textFieldProps}
      >
        {children}
      </TextField>
    </FormControl>
  );
};

export default Input;

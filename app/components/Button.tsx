"use client";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  Tooltip,
  SxProps,
  Theme,
} from "@mui/material";

interface CustomButtonProps {
  // Contenido
  text?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  // Agregar estas props para compatibilidad con MUI
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;

  // Comportamiento - actualizar para permitir parámetro de evento
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;

  // Accesibilidad
  title?: string;
  ariaLabel?: string;
  hotkey?: string;

  // Variantes de estilo - ACTUALIZADO: usar solo variantes válidas de MUI
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";

  // Props adicionales de MUI
  fullWidth?: boolean;
  href?: string;
  target?: string;
  download?: string | boolean;

  // Agregar prop sx para estilos personalizados
  sx?: SxProps<Theme>;

  // Agregar prop color para compatibilidad
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "inherit";
}

const Button: React.FC<CustomButtonProps> = ({
  text,
  children,
  icon,
  iconPosition = "right",
  startIcon,
  endIcon,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  title,
  ariaLabel,
  hotkey,
  variant = "contained",
  size = "small",
  fullWidth = false,
  href,
  target,
  download,
  sx,
  color = "primary",
}) => {
  useHotkeys(
    hotkey || "",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!disabled && !loading && onClick) {
        onClick(); // No pasamos el evento aquí
      }
    },
    {
      enabled: !disabled && !loading && !!hotkey,
      enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
      enableOnContentEditable: true,
      preventDefault: true,
      keydown: true,
      keyup: false,
      splitKey: "+",
      description: text ? `Botón: ${text}` : undefined,
    },
    [disabled, loading, onClick, hotkey]
  );

  // Configuración de íconos - priorizar startIcon/endIcon directos
  const buttonProps: Partial<MuiButtonProps> = {
    startIcon:
      startIcon ||
      (icon && iconPosition === "left" && !loading ? icon : undefined),
    endIcon:
      endIcon ||
      (icon && iconPosition === "right" && !loading ? icon : undefined),
  };

  // Si está loading, mostramos spinner
  if (loading) {
    if (iconPosition === "left" || startIcon) {
      buttonProps.startIcon = <CircularProgress size={16} />;
    } else {
      buttonProps.endIcon = <CircularProgress size={16} />;
    }
  }

  // Determinar el contenido del botón
  const buttonContent = children || text;

  // Separar las props que solo se aplican cuando hay href (enlace)
  const linkProps = href
    ? {
        href,
        target,
        download,
      }
    : {};

  const buttonElement = (
    <MuiButton
      // Props básicas
      variant={variant}
      color={color}
      size={size}
      type={type as MuiButtonProps["type"]}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      // Props de enlace (solo si hay href)
      {...linkProps}
      // Accesibilidad
      aria-label={ariaLabel || text}
      title={title}
      // Íconos
      {...buttonProps}
      // Estilos - combinar sx personalizado con estilos base
      sx={{
        textTransform: "uppercase",
        fontWeight: 400,
        borderRadius: 1,
        transition: "all 0.3s ease",
        boxShadow: variant === "contained" ? 2 : "none",
        "&:hover": {
          boxShadow: variant === "contained" ? 4 : "none",
          transform: variant === "contained" ? "translateY(-1px)" : "none",
        },
        "&.Mui-disabled": {
          opacity: 0.5,
          transform: "none",
        },
        // Tamaños personalizados
        ...(size === "small" && {
          fontSize: "0.75rem",
          minHeight: "32px",
          minWidth: "112px",
          px: 2,
          py: 1,
          "@media (min-width: 1536px)": {
            minWidth: "160px",
            minHeight: "36px",
          },
        }),
        ...(size === "medium" && {
          fontSize: "0.875rem",
          minHeight: "40px",
          minWidth: "120px",
          px: 3,
          py: 1.5,
        }),
        ...(size === "large" && {
          fontSize: "1rem",
          minHeight: "48px",
          minWidth: "140px",
          px: 4,
          py: 2,
        }),
        // Variante text con estilos específicos
        ...(variant === "text" && {
          backgroundColor: "transparent",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }),
        // Combinar con sx personalizado
        ...sx,
      }}
    >
      {loading && !icon ? <CircularProgress size={16} /> : buttonContent}
    </MuiButton>
  );

  // Envolver en Tooltip si hay título
  return title ? (
    <Tooltip title={title} arrow>
      {buttonElement}
    </Tooltip>
  ) : (
    buttonElement
  );
};

export default Button;

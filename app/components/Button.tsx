"use client";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ButtonProps } from "../lib/types/types";

const Button: React.FC<ButtonProps> = ({
  width = "w-auto",
  minwidth = "min-w-[10rem]",
  height = "h-[2rem] 2xl:h-auto",
  px = "px-4",
  py = "py-2",
  text,
  icon,
  iconPosition = "right",
  type = "button",
  onClick,
  colorText = "text-gray_b dark:text-white",
  colorTextHover = "hover:text-gray_b hover:dark:text-white",
  colorBg = "bg-blue_b",
  colorBgHover = "hover:bg-blue_m",
  disabled = false,
  hotkey,
}) => {
  // Configuración del hotkey
  useHotkeys(
    hotkey || "",
    (event) => {
      event.preventDefault();
      if (!disabled && onClick) {
        onClick();
      }
    },
    {
      enabled: !disabled && !!hotkey,
      enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
      preventDefault: true,
      keydown: true,
      keyup: false,
    },
    [disabled, onClick] // Dependencias
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      tabIndex={0}
      className={`${colorText} ${colorTextHover} ${width} ${minwidth} ${height} ${px} ${py} ${colorBg} ${colorBgHover} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } flex items-center justify-center gap-4 rounded transition-all duration-200`}
    >
      {icon && iconPosition === "left" && <span>{icon}</span>}
      {text && <span>{text}</span>}
      {icon && iconPosition === "right" && <span>{icon}</span>}
    </button>
  );
};

export default Button;

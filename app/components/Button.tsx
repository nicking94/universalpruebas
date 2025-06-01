"use client";
import React, { useEffect } from "react";
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
  useEffect(() => {
    if (!hotkey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["F1", "F2", "F3", "F4", "F5"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === hotkey && !disabled) {
        onClick?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hotkey, onClick, disabled]);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={` ${colorText} ${colorTextHover} ${width} ${minwidth} ${height} ${px} ${py} ${colorBg} ${colorBgHover} cursor-pointer flex items-center justify-center gap-4 rounded transition-all duration-200`}
    >
      {icon && iconPosition === "left" && <span>{icon}</span>}
      {text && <span>{text}</span>}
      {icon && iconPosition === "right" && <span>{icon}</span>}
    </button>
  );
};

export default Button;

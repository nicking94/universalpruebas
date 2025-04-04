"use client";
import React, { useState, useEffect } from "react";
import { NotificationProps } from "../lib/types/types";

const Notification: React.FC<NotificationProps> = ({
  isOpen,
  message,
  type,
}) => {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  const typeClasses = {
    success: "bg-green-700/90 text-white font-semibold",
    error: "bg-red-500/90 text-white font-semibold",
    info: "bg-blue-500/90 text-white font-semibold",
  };

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAnimateOut(false);
    } else {
      setAnimateOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div
      className={`min-w-[10rem] flex justify-center absolute bottom-4 right-10 z-50 rounded-md shadow-lg p-3 text-white transition-all duration-300 ${
        typeClasses[type]
      } ${
        animateOut
          ? "translate-y-[-20px] opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
};

export default Notification;

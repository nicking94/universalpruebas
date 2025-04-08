"use client";
import { useEffect, useRef } from "react";
import Input from "./Input";

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
  onScanComplete?: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export default function BarcodeScanner({
  value,
  onChange,
  onScanComplete,
  placeholder = "Escanea un código de barras",
}: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newValue = e.target.value;
    onChange(newValue);

    timeoutRef.current = setTimeout(() => {
      if (newValue.length > 0) {
        if (onScanComplete) {
          onScanComplete(newValue);
        }
        onChange("");
      }
    }, 300);
  };

  return (
    <Input
      type="text"
      ref={inputRef}
      value={value}
      onChange={handleBarcodeChange}
      placeholder={placeholder}
      autoFocus={true}
    />
  );
}

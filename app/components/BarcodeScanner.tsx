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
  const lastInputTimeRef = useRef<number>(0);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // En BarcodeScanner.tsx
  // En BarcodeScanner.tsx
  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const now = Date.now();

    onChange(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Detectar si es un escáner (entrada rápida)
    const isScannerInput = now - lastInputTimeRef.current < 30;

    timeoutRef.current = setTimeout(
      () => {
        if (newValue.length >= 8 && onScanComplete) {
          onScanComplete(newValue);
          // Enfocar el input después del escaneo
          if (inputRef.current) {
            inputRef.current.focus();
            // No limpiamos el valor aquí, lo hará el componente padre
          }
        }
      },
      isScannerInput ? 50 : 500 // Tiempos más ajustados
    );

    lastInputTimeRef.current = now;
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

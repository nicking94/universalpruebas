"use client";
import { useRef } from "react";
import Button from "@/app/components/Button";
import { FolderUp, FileDown } from "lucide-react";

interface ImportExportButtonsProps {
  onImport: (file: File) => void;
  onExport: () => void;
  isLoading?: boolean;
}

export default function ImportExportButtons({
  onImport,
  onExport,
  isLoading,
}: ImportExportButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        icon={<FileDown className="w-5 h-5" />}
        text="Exportar datos"
        onClick={onExport}
        disabled={isLoading}
        colorText="text-white"
        colorTextHover="text-white"
        colorBg="bg-green_b"
        colorBgHover="hover:bg-green-700"
      />

      <Button
        icon={<FolderUp className="w-5 h-5" />}
        text="Importar datos"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        colorText="text-white"
        colorTextHover="text-white"
        colorBg="bg-blue_b"
        colorBgHover="hover:bg-blue_m"
      />

      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import Button from "@/app/components/Button";
import { FolderUp, FileDown } from "lucide-react";
import { exportData, importData } from "../lib/utils/db-export-import";
import { useNotification } from "../context/NotificationContext";

export default function ImportExportButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      await importData(file);
      showNotification("Datos importados correctamente", "success");
    } catch (error) {
      console.error("Error al importar:", error);
      showNotification("Error al importar datos", "error");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await exportData();
      showNotification("Datos exportados correctamente", "success");
    } catch (error) {
      console.error("Error al exportar:", error);
      showNotification("Error al exportar datos", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        icon={<FileDown className="w-5 h-5" />}
        text="Exportar datos"
        onClick={handleExport}
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
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

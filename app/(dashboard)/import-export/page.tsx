"use client";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ImportExportButtons from "@/app/components/ImportExportButtons";
import { useState } from "react";
import { db } from "@/app/database/db";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { useNotification } from "@/app/context/NotificationContext";

export default function ImportExportPage() {
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const theme = await db.theme.toArray();
      const products = await db.products.toArray();
      const sales = await db.sales.toArray();
      const auth = await db.auth.toArray();

      const data = { theme, products, sales, auth };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const formattedDate = format(new Date(), "dd-MM-yyyy");

      saveAs(blob, `backup-${formattedDate}.json`);
      showNotification("Datos exportados correctamente", "success");
    } catch (error) {
      console.error("Error al exportar:", error);
      showNotification(
        `Error al exportar datos: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction(
        "rw",
        db.theme,
        db.products,
        db.sales,
        db.auth,
        async () => {
          await db.theme.clear();
          await db.products.clear();
          await db.sales.clear();
          await db.auth.clear();

          await db.theme.bulkAdd(data.theme || []);
          await db.products.bulkAdd(data.products || []);
          await db.sales.bulkPut(data.sales || []);
          await db.auth.bulkAdd(data.auth || []);
        }
      );

      showNotification("Datos importados correctamente", "success");
    } catch (error) {
      console.error("Error al importar:", error);
      showNotification(
        `Error al importar datos: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="px-10 py-3 2xl:p-10 text-gray_l dark:text-white h-[calc(100vh-80px)] relative">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">
          Importar o Exportar Datos
        </h1>
        <div className="h-[calc(100vh-160px)] 2xl:h-[80vh] flex items-center justify-center gap-10">
          <ImportExportButtons
            onImport={handleImport}
            onExport={handleExport}
            isLoading={isLoading}
          />
        </div>
        <p className="text-xs text-center font-light text-gray_l dark:text-gray_l italic">
          Universal App
          <span className="text-gray_m dark:text-gray_xl"> le recuerda</span> no
          olvidar en donde se guardan los archivos de recuperación, ya que sin
          ellos, no podrá recuperar sus datos.
        </p>
      </div>
    </ProtectedRoute>
  );
}

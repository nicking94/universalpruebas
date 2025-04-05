"use client";
import Button from "@/app/components/Button";
import { FolderDown } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { db } from "@/app/database/db";
import { saveAs } from "file-saver";
import { useState } from "react";
import ImportFileButton from "@/app/components/ImportFileButton";

export default function ImportExportPage() {
  const [loading, setLoading] = useState(false);

  const exportData = async () => {
    setLoading(true);
    const theme = await db.theme.toArray();
    const products = await db.products.toArray();
    const sales = await db.sales.toArray();
    const auth = await db.auth.toArray();

    const data = { theme, products, sales, auth };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });

    saveAs(blob, `backup-${new Date().toISOString()}.json`);
    setLoading(false);
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Importando archivo...");

    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);
    console.log("JSON importado completo:", data);

    setLoading(true);
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

        try {
          await db.theme.bulkAdd(data.theme || []);
          console.log("Theme importado");
        } catch (e) {
          console.error("Error en theme:", e);
        }

        try {
          await db.products.bulkAdd(data.products || []);
          console.log("Productos importados");
        } catch (e) {
          console.error("Error en products:", e);
        }

        try {
          await db.sales.bulkPut(data.sales || []);

          console.log("Ventas importadas");
        } catch (e) {
          console.error("Error en sales:", e);
        }

        try {
          await db.auth.bulkAdd(data.auth || []);
          console.log("Auth importado");
        } catch (e) {
          console.error("Error en auth:", e);
        }
      }
    );

    setLoading(false);
    alert("Datos importados correctamente");
  };

  return (
    <ProtectedRoute>
      <div className=" px-10 py-3 2xlp-10 text-gray_m dark:text-white  min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)]">
        <h1 className="text-2xl font-semibold mb-2">
          Importar o Exportar Datos
        </h1>
        <div className=" h-[80vh] 2xl:h-[83vh] flex items-center justify-center gap-10  ">
          <ImportFileButton onImport={importData} />
          <Button
            onClick={exportData}
            icon={<FolderDown className="w-5 h-5" />}
            iconPosition="left"
            disabled={loading}
            text="Exportar Datos"
            colorText="text-gray_b dark:text-white"
            colorTextHover="hover:text-white"
            colorBg="bg-blue_xl dark:bg-gray_m"
            colorBgHover="hover:bg-blue_l dark:hover:bg-gray_l"
          />
        </div>
        <p className="text-xs text-center font-light text-gray_l">
          Universal App
          <span className=" text-gray_m"> le recuerda</span> no olvidar en donde
          se guardan los archivos de recuperación, ya que sin ellos, no podrá
          recuperar sus datos.
        </p>
        {loading && <p className="mt-2">Procesando...</p>}
      </div>
    </ProtectedRoute>
  );
}

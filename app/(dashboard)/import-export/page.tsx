"use client";

import ProtectedRoute from "@/app/components/ProtectedRoute";
import ImportFileButton from "@/app/components/ImportFileButton";

export default function ImportExportPage() {
  return (
    <ProtectedRoute>
      <div className="px-10 py-3 2xl:p-10 text-gray_l dark:text-white h-[calc(100vh-80px)] relative">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">
          Importar o Exportar Datos
        </h1>
        <div className="h-[calc(100vh-160px)] 2xl:h-[80vh] flex items-center justify-center gap-10">
          <ImportFileButton />
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

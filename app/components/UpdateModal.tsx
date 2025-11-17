"use client";
import React from "react";
import Button from "./Button";

interface UpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
  onLogout: () => void;
  isUpdating: boolean;
  currentVersion: string;
  storedVersion?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onUpdate,
  onLogout,
  isUpdating,
  currentVersion,
  storedVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray_b rounded-xl p-8 max-w-md w-full shadow-2xl border-2 border-blue_b">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue_b rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-gray_b dark:text-white mb-3">
            🆕 Actualización Disponible
          </h3>

          <div className="bg-blue_xl dark:bg-gray_m rounded-lg p-4 mb-4">
            <p className="text-sm text-gray_b dark:text-white mb-2">
              <span className="font-semibold">Versión actual:</span>{" "}
              {storedVersion || "Desconocida"}
            </p>
            <p className="text-sm text-gray_b dark:text-white">
              <span className="font-semibold">Nueva versión:</span>{" "}
              {currentVersion}
            </p>
          </div>

          <p className="text-gray_m dark:text-gray_l mb-2 text-lg">
            Se ha detectado una nueva versión de la aplicación.
          </p>

          <p className="text-sm text-gray_m dark:text-gray_l mb-2">
            Para continuar usando todas las funciones correctamente, es
            necesario actualizar.
          </p>

          <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mt-3">
            <strong>💡 Recomendación:</strong> Guarde cualquier trabajo en
            progreso antes de actualizar.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={onUpdate}
            disabled={isUpdating}
            text={isUpdating ? "🔄 Actualizando..." : "✅ Actualizar Ahora"}
            colorText="text-white"
            colorBg="bg-green-600 hover:bg-green-700"
            colorBgHover="hover:bg-green-700"
            width="w-full"
            height="h-12"
            py="py-3"
          />

          <Button
            onClick={onLogout}
            disabled={isUpdating}
            text="🚪 Cerrar Sesión y Actualizar"
            colorText="text-white"
            colorBg="bg-blue_b hover:bg-blue_m"
            colorBgHover="hover:bg-blue_m"
            width="w-full"
            height="h-12"
            py="py-3"
          />
        </div>

        {isUpdating && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
            <p className="text-sm text-gray_m">Actualizando aplicación...</p>
            <p className="text-xs text-gray_m mt-1">
              Esto puede tomar unos segundos
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;

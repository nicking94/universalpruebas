"use client";
import { useState, useEffect, useCallback } from "react";
import { APP_VERSION } from "@/app/lib/constants/constants";
import { db } from "../database/db";

export const useAppVersion = () => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStoredVersion, setCurrentStoredVersion] = useState<
    string | undefined
  >();

  // Verificar si hay una nueva versión
  const checkForUpdates = useCallback(async () => {
    try {
      console.log("🔍 Verificando actualizaciones...");
      console.log("📦 Versión actual:", APP_VERSION);

      const preferences = await db.userPreferences.get(1);
      const storedVersion = preferences?.appVersion;

      console.log("💾 Versión almacenada en DB:", storedVersion);

      setCurrentStoredVersion(storedVersion);

      // Si no hay versión almacenada, es la primera vez - guardar y no mostrar modal
      if (!storedVersion) {
        console.log("📝 Primera ejecución, guardando versión inicial");
        await updateStoredVersion();
        return false;
      }

      if (storedVersion !== APP_VERSION) {
        console.log("🆕 Nueva versión detectada! Mostrando modal...");
        setShowUpdateModal(true);
        return true;
      }

      console.log("✅ Versión actualizada");
      return false;
    } catch (error) {
      console.error("❌ Error checking app version:", error);
      return false;
    }
  }, []);

  // Actualizar la versión almacenada
  const updateStoredVersion = useCallback(async () => {
    try {
      console.log("💾 Guardando nueva versión en DB:", APP_VERSION);

      const existingPrefs = await db.userPreferences.get(1);
      if (existingPrefs) {
        await db.userPreferences.update(existingPrefs.id!, {
          appVersion: APP_VERSION,
        });
      } else {
        // Agregar valores por defecto para consistencia
        await db.userPreferences.add({
          appVersion: APP_VERSION,
          acceptedTerms: false,
          itemsPerPage: 10,
        });
      }

      console.log("✅ Versión guardada exitosamente");
    } catch (error) {
      console.error("❌ Error guardando versión:", error);
    }
  }, []);

  // Forzar actualización
  const forceUpdate = useCallback(async () => {
    setIsUpdating(true);
    console.log("🔄 Iniciando actualización forzada...");

    try {
      // Actualizar la versión almacenada primero
      await updateStoredVersion();

      // Esperar un momento para que se guarde en la DB
      setTimeout(() => {
        console.log("🔄 Recargando aplicación...");
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("❌ Error durante la actualización:", error);
      setIsUpdating(false);
    }
  }, [updateStoredVersion]);

  // Cerrar sesión y actualizar
  const logoutAndUpdate = useCallback(async () => {
    console.log("🚪 Cerrando sesión y actualizando...");

    try {
      // Cerrar sesión
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });

      // Actualizar versión
      await updateStoredVersion();

      // Redirigir al login
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    } catch (error) {
      console.error("❌ Error durante logout y update:", error);
    }
  }, [updateStoredVersion]);

  // Verificar actualizaciones al montar
  useEffect(() => {
    const initializeVersion = async () => {
      // Verificación simple - el hook checkForUpdates ya maneja la lógica completa
      await checkForUpdates();
    };

    initializeVersion();

    // Verificar periódicamente (cada 5 minutos en lugar de 2)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    showUpdateModal,
    setShowUpdateModal,
    isUpdating,
    forceUpdate,
    logoutAndUpdate,
    currentVersion: APP_VERSION,
    storedVersion: currentStoredVersion,
    checkForUpdates,
  };
};

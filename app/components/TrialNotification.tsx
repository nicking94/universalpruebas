"use client";
import { useEffect, useState } from "react";
import { db } from "../database/db";

const TrialNotification = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await db.auth.get(1);
      if (auth?.isAuthenticated && auth.userId) {
        setUserId(auth.userId);
        const user = await db.users.get(auth.userId);
        setIsDemoUser(user?.username === "demo");
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!userId || !isDemoUser) return;

    const calculateRemainingDays = async () => {
      try {
        let trialRecord = await db.trialPeriods.get(userId);

        // Si no existe registro, lo creamos
        if (!trialRecord) {
          const newRecord = {
            userId: userId,
            firstAccessDate: new Date(),
          };
          await db.trialPeriods.put(newRecord);
          trialRecord = newRecord;
          console.log("Nuevo registro de prueba creado:", newRecord);
        }

        const startDate = new Date(trialRecord.firstAccessDate);
        const currentDate = new Date();

        // Ajuste para considerar el día actual como día 1
        const diffTime = currentDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Días restantes (7 días totales - días transcurridos)
        const remainingDays = Math.max(0, 7 - diffDays);

        console.log("Fecha inicio:", startDate);
        console.log("Días transcurridos:", diffDays);
        console.log("Días restantes:", remainingDays);

        setDaysLeft(remainingDays);
      } catch (error) {
        console.error("Error calculating trial days:", error);
        setDaysLeft(null);
      }
    };

    calculateRemainingDays();
    const interval = setInterval(calculateRemainingDays, 3600000); // Chequear cada hora

    return () => clearInterval(interval);
  }, [userId, isDemoUser]);

  if (daysLeft === null || !isDemoUser) return null;

  return (
    <div
      className={`fixed top-7 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-md shadow-md z-50 text-sm font-medium ${
        daysLeft > 4
          ? "bg-green-100 text-green-800"
          : daysLeft > 1
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {daysLeft > 0 ? (
        <span>
          Días restantes de prueba: <strong>{daysLeft}</strong>
        </span>
      ) : (
        <span>¡Periodo de prueba finalizado!</span>
      )}
    </div>
  );
};

export default TrialNotification;

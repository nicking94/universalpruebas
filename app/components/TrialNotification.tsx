"use client";
import { useEffect, useState } from "react";
import { db } from "../database/db";

const TrialNotification = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await db.auth.get(1);
      if (auth?.isAuthenticated && auth.userId) {
        setUserId(auth.userId);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const checkTrial = async () => {
      const trialRecord = await db.trialPeriods
        .where("userId")
        .equals(userId)
        .first();
      if (trialRecord) {
        const firstAccess = new Date(trialRecord.firstAccessDate);
        const now = new Date();
        const diffInMs = now.getTime() - firstAccess.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        setDaysLeft(Math.max(0, Math.floor(7 - diffInDays)));
      }
    };

    checkTrial();
  }, [userId]);

  if (daysLeft === null) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow-md z-50">
      {daysLeft > 0 ? (
        <p>
          Días restantes de prueba:{" "}
          <span className="font-bold">{daysLeft}</span>
        </p>
      ) : (
        <p className="text-red-600 font-bold">Periodo de prueba expirado</p>
      )}
    </div>
  );
};

export default TrialNotification;

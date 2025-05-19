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
    <div
      className={`animate-pulse fixed top-7 left-1/2 text-md px-10 shadow-sm z-50 ${
        daysLeft > 4
          ? "bg-green-100 text-gray_b shadow-green-200"
          : daysLeft >= 1 && daysLeft <= 4
          ? "bg-yellow-100 text-gray_b shadow-yellow-200"
          : "bg-red-500 text-white shadow-red-300"
      }`}
    >
      {daysLeft > 0 ? (
        <p className="italic">
          Días restantes de prueba:{" "}
          <span className="font-bold">{daysLeft}</span>
        </p>
      ) : (
        <p className="font-bold">Periodo de prueba terminado</p>
      )}
    </div>
  );
};

export default TrialNotification;

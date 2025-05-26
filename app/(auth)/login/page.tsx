"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/app/components/AuthForm";
import Notification from "@/app/components/Notification";
import { AuthData, User } from "@/app/lib/types/types";
import { TRIAL_CREDENTIALS, USERS } from "@/app/lib/constants/constants";
import { db } from "../../database/db";

const LoginPage = () => {
  const router = useRouter();
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("expired") === "true") {
      setNotificationMessage("Su periodo de prueba ha expirado");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 3000);
    }

    const initializeUsers = async () => {
      // Eliminar usuario admin si existe
      const adminUser = await db.users
        .where("username")
        .equals("admin")
        .first();
      if (adminUser) {
        await db.users.delete(adminUser.id);
      }

      // Verificar si los usuarios existen
      const count = await db.users.count();
      if (count === 0) {
        const usersToAdd: User[] = USERS.map((user) => ({
          id: user.id,
          username: user.username,
          password: user.password,
        }));
        await db.users.bulkAdd(usersToAdd);
      } else {
        const adminUser = await db.users.get(2);
        if (!adminUser || adminUser.username !== "administrador") {
          await db.users.put({
            id: 2,
            username: "administrador",
            password: "administrador",
          });
        }
      }
    };
    initializeUsers();
  }, []);

  const checkTrialPeriod = async (userId: number) => {
    try {
      const now = new Date();
      const trialRecord = await db.trialPeriods.get(userId);

      if (!trialRecord) {
        await db.trialPeriods.put({
          userId: userId,
          firstAccessDate: now,
        });
        return true;
      }

      const firstAccess = new Date(trialRecord.firstAccessDate);
      if (isNaN(firstAccess.getTime())) {
        await db.trialPeriods.put({
          userId: userId,
          firstAccessDate: now,
        });
        return true;
      }

      const diffInMs = now.getTime() - firstAccess.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      return diffInDays <= 7;
    } catch (err) {
      console.error("Error al verificar periodo de prueba:", err);
      return false;
    }
  };

  const handleLogin = async (data: AuthData) => {
    // Verificar si es el usuario demo
    if (
      data.username === TRIAL_CREDENTIALS.username &&
      data.password === TRIAL_CREDENTIALS.password
    ) {
      const demoUser = await db.users
        .where("username")
        .equals(TRIAL_CREDENTIALS.username)
        .first();

      // Si no existe el usuario demo, rechazar el login
      if (!demoUser) {
        setNotificationMessage("El periodo de prueba ha finalizado");
        setNotificationType("error");
        setIsOpenNotification(true);
        setTimeout(() => setIsOpenNotification(false), 2000);
        return;
      }

      if (demoUser) {
        const trialRecord = await db.trialPeriods.get(demoUser.id);

        if (trialRecord) {
          const firstAccess = new Date(trialRecord.firstAccessDate);
          const now = new Date();
          const diffInMs = now.getTime() - firstAccess.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

          if (diffInDays > 7) {
            setNotificationMessage(
              "El periodo de prueba de 1 semana ha expirado"
            );
            setNotificationType("error");
            setIsOpenNotification(true);
            setTimeout(() => setIsOpenNotification(false), 2000);
            return;
          }
        }
      }
    }

    const user = await db.users
      .where("username")
      .equals(data.username)
      .and((user) => user.password === data.password)
      .first();

    if (!user) {
      setNotificationMessage("Usuario o contraseña incorrectos");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2000);
      return;
    }

    if (data.username === TRIAL_CREDENTIALS.username) {
      const existingTrial = await db.trialPeriods.get(user.id);

      if (!existingTrial) {
        await db.trialPeriods.put({
          userId: user.id,
          firstAccessDate: new Date(),
        });
      }

      const isTrialValid = await checkTrialPeriod(user.id);

      if (!isTrialValid) {
        setNotificationMessage("El periodo de prueba de 1 semana ha expirado");
        setNotificationType("error");
        setIsOpenNotification(true);
        setTimeout(() => setIsOpenNotification(false), 2000);
        return;
      }
    }

    await db.auth.put({ id: 1, isAuthenticated: true, userId: user.id });
    await db.appState.put({ id: 1, lastActiveDate: new Date() });

    setNotificationMessage("Inicio de sesión exitoso");
    setNotificationType("success");
    setIsOpenNotification(true);
    setTimeout(() => {
      setIsOpenNotification(false);
      router.push("/caja-diaria");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex bg-blue-100">
      <AuthForm type="login" onSubmit={handleLogin} />

      <Notification
        isOpen={isOpenNotification}
        message={notificationMessage}
        type={notificationType}
      />
    </div>
  );
};

export default LoginPage;

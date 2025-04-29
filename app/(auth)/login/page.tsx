"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/app/components/AuthForm";
import Notification from "@/app/components/Notification";
import { AuthData } from "@/app/lib/types/types";
import { LOGIN_INFO } from "@/app/lib/constants/constants";
import { db } from "../../database/db";

const LoginPage = () => {
  const router = useRouter();
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");

  const handleLogin = async (data: AuthData) => {
    if (
      data.username !== LOGIN_INFO.username ||
      data.password !== LOGIN_INFO.password
    ) {
      setNotificationMessage("Usuario o contraseña incorrectos");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => {
        setIsOpenNotification(false);
      }, 2000);
      return;
    }
    await db.auth.put({ id: 1, isAuthenticated: true });

    setNotificationMessage("Inicio de sesión exitoso");
    setNotificationType("success");
    setIsOpenNotification(true);
    setTimeout(() => {
      setIsOpenNotification(false);
      router.push("/caja-diaria");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex bg-blue-100 ">
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

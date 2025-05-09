"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/app/components/AuthForm";
import Notification from "@/app/components/Notification";
import { AuthData, User } from "@/app/lib/types/types";
import { USERS } from "@/app/lib/constants/constants";
import { db } from "../../database/db";

const LoginPage = () => {
  const router = useRouter();
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");

  // Opcional: cargar usuarios en la base de datos al montar el componente
  useEffect(() => {
    const initializeUsers = async () => {
      const count = await db.users.count();
      if (count === 0) {
        const usersToAdd: User[] = USERS.map((user) => ({
          id: user.id,
          username: user.username,
          password: user.password,
        }));
        await db.users.bulkAdd(usersToAdd);
      }
    };
    initializeUsers();
  }, []);

  const handleLogin = async (data: AuthData) => {
    // Buscar el usuario en la base de datos
    const user = await db.users
      .where("username")
      .equals(data.username)
      .and((user) => user.password === data.password)
      .first();

    if (!user) {
      setNotificationMessage("Usuario o contraseña incorrectos");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => {
        setIsOpenNotification(false);
      }, 2000);
      return;
    }

    // Guardar el estado de autenticación con el ID del usuario
    await db.auth.put({ id: 1, isAuthenticated: true, userId: user.id });

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

import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../database/db";

type ResponseData = {
  success?: boolean;
  error?: string;
};

type User = {
  id: number;
  username: string;
  password: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Verificación de variables de entorno
    const envUsers: User[] = [
      {
        id: 1,
        username: process.env.LOGIN_USERNAME_1 || "",
        password: process.env.LOGIN_PASSWORD_1 || "",
      },
      {
        id: 2,
        username: process.env.LOGIN_USERNAME_2 || "",
        password: process.env.LOGIN_PASSWORD_2 || "",
      },
    ];

    // Verificar que todas las credenciales estén configuradas
    if (envUsers.some((user) => !user.username || !user.password)) {
      throw new Error(
        "Configuración de usuario incompleta en variables de entorno"
      );
    }

    const count = await db.users.count();
    if (count === 0) {
      await db.users.bulkAdd(envUsers);
    }

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ error: errorMessage });
  }
}

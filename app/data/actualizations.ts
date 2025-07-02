import { db } from "../database/db";

export type Actualization = {
  id: number;
  title: string;
  message: string;

  date?: string;
};

export const systemActualizations: Actualization[] = [
  {
    id: 1,
    title: "Versión 1.4.1",
    message:
      "- Agregado sistema de notificaciones\n- Ordenadas alfabéticamente las tablas de productos, clientes y proveedores\n- Corrección de errores\n- Mejoras en el rendimiento",
    date: new Date().toISOString(),
  },
];

export const getUnshownActualizations = async (): Promise<Actualization[]> => {
  const [existingNotifications, deletedActualizations] = await Promise.all([
    db.notifications.where("type").equals("system").toArray(),
    db.deletedActualizations.toArray(),
  ]);

  const shownIds = existingNotifications.map((n) => n.actualizationId || 0);
  const deletedIds = deletedActualizations.map((d) => d.actualizationId);

  return systemActualizations.filter(
    (actualization) =>
      !shownIds.includes(actualization.id) &&
      !deletedIds.includes(actualization.id)
  );
};

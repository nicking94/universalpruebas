import { db } from "@/app/database/db";
export const ensureCashIsOpen = async () => {
  const today = new Date().toISOString().split("T")[0];
  const dailyCash = await db.dailyCashes.get({ date: today });

  if (!dailyCash) {
    return { isOpen: false, cash: null, needsRedirect: true };
  }

  return {
    isOpen: !dailyCash.closed,
    cash: dailyCash,
    needsRedirect: dailyCash.closed,
  };
};

import { db } from "@/app/database/db";

export const clearBrowserCache = async () => {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    localStorage.removeItem("cacheVersion");
    sessionStorage.clear();

    try {
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });
    } catch (dbError) {
      console.error("Error cerrando sesión en IndexedDB:", dbError);
    }

    window.location.href = "/login";

    return true;
  } catch (error) {
    console.error("Error clearing cache:", error);
    return false;
  }
};

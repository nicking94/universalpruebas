import { db } from "@/app/database/db";

const MIN_COMPATIBLE_VERSION = "1.4";

export const clearBrowserCache = async (fullReset: boolean = false) => {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    const preserveKeys = ["appVersion", "trialStartDate", "lastAuthUser"];

    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (!preserveKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    }

    sessionStorage.clear();

    if (fullReset) {
      await db.auth.clear();
      await db.trialPeriods.clear();

      const essentialUsers = await db.users
        .where("username")
        .anyOf(["demo", "administrador"])
        .toArray();

      await db.users.clear();
      await db.users.bulkAdd(essentialUsers);
    } else {
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });
    }

    return true;
  } catch (error) {
    console.error("Error clearing cache:", error);
    return false;
  }
};

export const checkVersionAndClean = async (currentVersion: string) => {
  const storedVersion = localStorage.getItem("appVersion");

  if (storedVersion !== currentVersion) {
    const isVersionLess = (v1: string, v2: string) => {
      const [m1, n1, p1] = v1.split(".").map(Number);
      const [m2, n2, p2] = v2.split(".").map(Number);

      return (
        m1 < m2 || (m1 === m2 && n1 < n2) || (m1 === m2 && n1 === n2 && p1 < p2)
      );
    };

    const needsFullReset =
      !storedVersion || isVersionLess(storedVersion, MIN_COMPATIBLE_VERSION);

    await clearBrowserCache(needsFullReset);
    localStorage.setItem("appVersion", currentVersion);

    return true;
  }

  return false;
};

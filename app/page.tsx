"use client";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { clearBrowserCache } from "./lib/utils/cacheUtils";

export default function Home() {
  useEffect(() => {
    const version = "1.3";

    if (localStorage.getItem("appVersion") !== version) {
      localStorage.setItem("appVersion", version);
      clearBrowserCache().then(() => {});
    } else {
      redirect("/login");
    }
  }, []);

  return null;
}

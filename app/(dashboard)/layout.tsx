"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import { useRouter } from "next/navigation";
import { db } from "../database/db";
import { AuthProvider } from "../context/AuthContext";
import TrialNotification from "../components/TrialNotification";
import { BusinessDataProvider } from "../context/BusinessDataContext";
import { PaginationProvider } from "../context/PaginationContext";
import UpdatesManager from "../components/Notifications/UpdatesManager";
import PaymentNotification from "../components/PaymentNotification";
import { useAppVersion } from "../hooks/useAppVersion";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { lightTheme, darkTheme } from "@/app/theme/theme";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isSidebarOpen } = useSidebar();
  const router = useRouter();
  const [theme, setTheme] = useState<string>("light");
  const { isUpdating, isAutoUpdate } = useAppVersion();

  const handleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleCloseSession = async () => {
    try {
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });
      router.replace("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await db.theme.get(1);
      if (savedTheme) {
        setTheme(savedTheme.value);
      } else {
        document.documentElement.classList.add("light");
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const saveTheme = async () => {
      await db.theme.put({ id: 1, value: theme });
    };
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    saveTheme();
  }, [theme]);

  const muiTheme = theme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <BusinessDataProvider>
          <PaginationProvider>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                bgcolor: "background.default",
                color: "text.primary",
              }}
            >
              <TrialNotification />
              <PaymentNotification />
              <UpdatesManager />

              {isUpdating && isAutoUpdate && (
                <div className="fixed top-4 right-4 z-50 bg-blue_b text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Actualizando...</span>
                  </div>
                </div>
              )}

              <Navbar
                theme={theme}
                handleTheme={handleTheme}
                handleCloseSession={handleCloseSession}
              />

              <Box
                sx={{
                  position: "relative",
                  flex: 1,
                  mt: "62px",
                }}
              >
                <Sidebar />

                <Box
                  component="main"
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: isSidebarOpen ? "256px" : "120px",
                    right: 0,
                    bottom: 0,
                    transition: muiTheme.transitions.create(["left"], {
                      duration: muiTheme.transitions.duration.standard,
                    }),
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {children}
                </Box>
              </Box>
            </Box>
          </PaginationProvider>
        </BusinessDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

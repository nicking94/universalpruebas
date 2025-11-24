"use client";
import { useEffect, useState } from "react";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Slide,
  SlideProps,
} from "@mui/material";
import { db } from "../database/db";
import { TRIAL_CREDENTIALS } from "../lib/constants/constants";
import { Tags, BadgePercent, Zap, AlertTriangle } from "lucide-react";

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

const TrialNotification = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [discountDate, setDiscountDate] = useState<string>("");
  const [showNotification, setShowNotification] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);

  const checkAuthState = async () => {
    try {
      const auth = await db.auth.get(1);
      const authenticated = auth?.isAuthenticated ?? false;
      setIsAuthenticated(authenticated);

      if (authenticated && auth?.userId) {
        const user = await db.users.get(auth.userId);

        if (!user) {
          console.error("Usuario no encontrado");
          setUserId(null);
          setIsDemoUser(false);
          return;
        }

        setUserId(auth.userId);
        setIsDemoUser(user.username === TRIAL_CREDENTIALS.username);
      } else {
        setUserId(null);
        setIsDemoUser(false);
      }
    } catch (error) {
      console.error("Error verificando autenticación:", error);
      setUserId(null);
      setIsDemoUser(false);
      setIsAuthenticated(false);
    }
  };

  const calculateRemainingDays = async () => {
    try {
      let trialRecord = await db.trialPeriods.get(userId!);
      const now = new Date();

      if (!trialRecord) {
        const newRecord = {
          userId: userId!,
          firstAccessDate: now,
        };
        await db.trialPeriods.put(newRecord);
        trialRecord = newRecord;
      }

      const startDate = new Date(trialRecord.firstAccessDate);
      if (isNaN(startDate.getTime())) {
        await db.trialPeriods.put({
          userId: userId!,
          firstAccessDate: now,
        });
        setDaysLeft(7);
        return;
      }

      const diffTime = now.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, 7 - diffDays);

      setDaysLeft(remainingDays);
      await db.appState.put({ id: 1, lastActiveDate: now });

      const discountEndDate = new Date(startDate);
      discountEndDate.setDate(startDate.getDate() + 3);
      const formattedDiscountDate = discountEndDate.toLocaleDateString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );
      setDiscountDate(formattedDiscountDate);
    } catch (error) {
      console.error("Error calculando días:", error);
      setDaysLeft(null);
    }
  };

  useEffect(() => {
    checkAuthState();
    const interval = setInterval(checkAuthState, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId || !isDemoUser) {
      setDaysLeft(null);
      setShowNotification(false);
      setShowDiscount(false);
      return;
    }

    calculateRemainingDays();
    const interval = setInterval(calculateRemainingDays, 3600000);
    return () => clearInterval(interval);
  }, [userId, isDemoUser, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && isDemoUser && daysLeft !== null) {
      setShowNotification(true);

      // Mostrar descuento si hay días restantes
      if (daysLeft > 0) {
        const now = new Date();
        const discountEndDate = new Date(
          discountDate.split("/").reverse().join("-")
        );
        if (now <= discountEndDate) {
          setShowDiscount(true);
        }
      }
    }
  }, [isAuthenticated, isDemoUser, daysLeft, discountDate]);

  const getNotificationSeverity = () => {
    if (!daysLeft) return "info";

    if (daysLeft >= 4) {
      return "success";
    }
    if (daysLeft >= 2 && daysLeft < 4) {
      return "warning";
    }
    return "error";
  };

  const getNotificationMessage = () => {
    if (!daysLeft) return "";

    if (daysLeft === 0) {
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <AlertTriangle size={16} />
          <Typography variant="body2">
            ¡Periodo de prueba finalizado! La sesión se cerrará automáticamente
          </Typography>
        </Box>
      );
    }
    if (daysLeft === 1) {
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <Zap size={16} />
          <Typography variant="body2">¡Último día de prueba!</Typography>
        </Box>
      );
    }
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Tags size={16} />
        <Typography variant="body2">
          Días restantes de prueba: {daysLeft}
        </Typography>
      </Box>
    );
  };

  const getDiscountMessage = () => {
    if (!daysLeft || !discountDate) return "";

    const now = new Date();
    const discountEndDate = new Date(
      discountDate.split("/").reverse().join("-")
    );

    if (now > discountEndDate) {
      return `Descuento vencido, puedes seguir navegando la demo por ${daysLeft} días`;
    }
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <BadgePercent size={18} />
        <Typography variant="body2" fontWeight="bold" color="error.main">
          20% OFF
        </Typography>
        <Typography variant="body2">hasta el {discountDate}</Typography>
      </Box>
    );
  };

  if (!isAuthenticated || !isDemoUser || daysLeft === null) {
    return null;
  }

  return (
    <>
      {/* Notificación principal de días restantes */}
      <Snackbar
        open={showNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={SlideTransition}
        sx={{
          position: "fixed",
          zIndex: 9999,
          top: "20px !important",
          "& .MuiSnackbar-root": {
            position: "fixed",
          },
        }}
      >
        <Alert
          severity={getNotificationSeverity()}
          icon={false}
          sx={{
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            borderRadius: "8px",
            minWidth: 300,
            zIndex: 9999,
            "& .MuiAlert-message": {
              padding: "8px 0",
              width: "100%",
            },
          }}
        >
          {getNotificationMessage()}
        </Alert>
      </Snackbar>

      {/* Notificación de descuento */}
      {daysLeft > 0 && (
        <Snackbar
          open={showDiscount}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{
            position: "fixed",
            zIndex: 9998,
            top: "80px !important",
            "& .MuiSnackbar-root": {
              position: "fixed",
            },
          }}
        >
          <Alert
            severity="info"
            icon={false}
            sx={{
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              borderRadius: "8px",
              minWidth: 300,
              zIndex: 9998,
              backgroundColor: "primary.light",
              color: "primary.dark",
              "& .MuiAlert-message": {
                padding: "8px 0",
                width: "100%",
              },
            }}
          >
            {getDiscountMessage()}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

export default TrialNotification;

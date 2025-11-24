"use client";
import { Snackbar, Alert, AlertProps, Slide, SlideProps } from "@mui/material";
import { NotificationProps } from "../lib/types/types";
import { forwardRef } from "react";
import { useTheme } from "@mui/material/styles";

// Transition component for smooth slide-in
const SlideTransition = forwardRef<HTMLDivElement, SlideProps>(
  function Transition(props, ref) {
    return <Slide {...props} direction="left" ref={ref} />;
  }
);

export default function Notification({
  isOpen,
  message,
  type,
  onClose,
  autoHideDuration = 6000,
}: NotificationProps & { onClose?: () => void; autoHideDuration?: number }) {
  const theme = useTheme();

  const getSeverity = (): AlertProps["severity"] => {
    switch (type) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "info":
        return "info";
      default:
        return "info";
    }
  };

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    onClose?.();
  };

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={SlideTransition}
      sx={{
        position: "fixed",
        zIndex: 9999,
        "& .MuiSnackbar-root": {
          position: "fixed",
        },
        // Responsive positioning
        "&.MuiSnackbar-anchorOriginBottomRight": {
          [theme.breakpoints.down("sm")]: {
            bottom: 16,
            right: 16,
            left: 16,
          },
        },
      }}
    >
      <Alert
        severity={getSeverity()}
        onClose={handleClose}
        variant="filled"
        sx={{
          boxShadow: 3,
          borderRadius: 2,
          fontWeight: 500,
          fontSize: "0.875rem",
          alignItems: "center",
          minWidth: 300,
          maxWidth: 500,
          width: "auto",
          "& .MuiAlert-message": {
            padding: "8px 0",
          },
          "& .MuiAlert-action": {
            alignItems: "center",
            padding: 0,
            marginRight: 0,
          },
          // Responsive styles
          [theme.breakpoints.down("sm")]: {
            minWidth: "auto",
            width: "100%",
            maxWidth: "calc(100vw - 32px)",
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

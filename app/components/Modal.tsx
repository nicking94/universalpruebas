"use client";
import { ModalProps } from "../lib/types/types";
import { useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  styled,
  alpha,
} from "@mui/material";
import { Close } from "@mui/icons-material";

// Constantes para mejor mantenibilidad
const MODAL_SIZES = {
  xs: "95vw",
  sm: "90vw",
  md: "85vw",
  lg: "80vw",
  xl: "70vw",
  maxWidth: "1200px",
} as const;

const COLORS = {
  backdrop: "#1e293b",
  primary: "#3b82f6",
  secondary: "#64748b",
  success: "#10b981",
  error: "#ef4444",
  background: {
    light: "#ffffff",
    subtle: "#ffffff",
    muted: "#ffffff",
  },
  border: {
    light: "rgba(203, 213, 225, 0.6)",
    subtle: "rgba(203, 213, 225, 0.3)",
  },
  gray_xxl: "#f3f4f6",
} as const;

const ANIMATION = {
  duration: "0.2s",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    backgroundColor: alpha(COLORS.backdrop, 0.8),
    backdropFilter: "blur(8px)",
    animation: `${fadeIn} 0.3s ${ANIMATION.easing}`,
  },
  "& .MuiDialog-paper": {
    margin: theme.spacing(2),
    width: MODAL_SIZES.xs,
    [theme.breakpoints.up("sm")]: { width: MODAL_SIZES.sm },
    [theme.breakpoints.up("md")]: { width: MODAL_SIZES.md },
    [theme.breakpoints.up("lg")]: { width: MODAL_SIZES.lg },
    [theme.breakpoints.up("xl")]: {
      width: MODAL_SIZES.xl,
      maxWidth: MODAL_SIZES.maxWidth,
    },
    minHeight: "auto",
    maxHeight: "95vh",
    borderRadius: "16px",
    boxShadow: `
      0 32px 64px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
    `,
    background: COLORS.background.light,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
    animation: `${scaleIn} 0.3s ${ANIMATION.easing}`,

    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "1px",
      background: `linear-gradient(90deg, transparent, ${alpha(
        COLORS.primary,
        0.4
      )}, transparent)`,
    },
  },
}));

// Animaciones keyframes
const fadeIn = {
  "0%": { opacity: 0 },
  "100%": { opacity: 1 },
};

const scaleIn = {
  "0%": {
    opacity: 0,
    transform: "scale(0.95) translateY(10px)",
  },
  "100%": {
    opacity: 1,
    transform: "scale(1) translateY(0)",
  },
};

// Componente para el área fija del TOTAL
const FixedTotalSection = styled(Box)(({ theme }) => ({
  position: "sticky",
  bottom: 0,
  left: 0,
  right: 0,
  background: COLORS.gray_xxl,
  borderTop: `1px solid ${COLORS.border.light}`,
  padding: theme.spacing(2, 3),
  zIndex: 10,
  boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: "bold",
  fontSize: "1.1rem",
}));

const Modal: React.FC<ModalProps & { fixedTotal?: React.ReactNode }> = ({
  isOpen,
  title = "Confirmación",
  children,
  onClose,
  onConfirm,
  buttons,
  zIndex = 1300,
  fixedTotal, // Nueva prop para el contenido fijo del TOTAL
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    },
    [onConfirm, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    window.scrollTo({ top: 0 });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <StyledDialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      sx={{ zIndex }}
    >
      {/* Header con fondo azul claro */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: COLORS.gray_xxl,
          borderBottom: `1px solid ${COLORS.border.light}`,
          position: "relative",
          flexShrink: 0,
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: "10%",
            right: "10%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${alpha(
              COLORS.primary,
              0.2
            )}, transparent)`,
          },
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontSize: { xs: "1.3rem", sm: "1.5rem" },
            fontWeight: 700,
            color: "#1e293b",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>

        <IconButton
          onClick={onClose}
          size="medium"
          sx={{
            color: COLORS.secondary,
            backgroundColor: alpha(COLORS.secondary, 0.08),
            borderRadius: "10px",
            padding: "10px",
            transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
            "&:hover": {
              backgroundColor: alpha(COLORS.primary, 0.1),
              color: COLORS.primary,
              transform: "scale(1.1)",
              boxShadow: `0 4px 10px ${alpha(COLORS.primary, 0.2)}`,
            },
            "&:active": {
              transform: "scale(0.65)",
            },
          }}
          aria-label="Cerrar modal"
        >
          <Close sx={{ fontSize: "1rem" }} />
        </IconButton>
      </DialogTitle>

      {/* Content - Ahora con soporte para área fija DENTRO del contenido */}
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          background: COLORS.background.light,
          position: "relative",
          padding: 0,
        }}
      >
        {/* Contenedor principal del contenido */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Área de contenido desplazable */}
          <Box
            sx={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: 1,
              minHeight: 0,
              padding: 3,

              // Scrollbar personalizada
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: alpha(COLORS.secondary, 0.08),
                borderRadius: "12px",
                margin: "12px 0",
              },
              "&::-webkit-scrollbar-thumb": {
                background: `linear-gradient(180deg, ${alpha(
                  COLORS.secondary,
                  0.4
                )} 0%, ${alpha(COLORS.secondary, 0.6)} 100%)`,
                borderRadius: "12px",
                border: `2px solid ${COLORS.background.light}`,
                backgroundClip: "padding-box",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: `linear-gradient(180deg, ${alpha(
                  COLORS.secondary,
                  0.6
                )} 0%, ${alpha(COLORS.secondary, 0.8)} 100%)`,
              },
              "&::-webkit-scrollbar-corner": {
                background: "transparent",
              },

              // Firefox
              scrollbarWidth: "unset",
              scrollbarColor: `${alpha(COLORS.secondary, 0.6)} ${alpha(
                COLORS.secondary,
                0.1
              )}`,
            }}
          >
            {children}
          </Box>

          {fixedTotal && <FixedTotalSection>{fixedTotal}</FixedTotalSection>}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          padding: "24px",
          background: COLORS.gray_xxl,
          borderTop: `1px solid ${COLORS.border.subtle}`,
          gap: { xs: 2, sm: 3 },
          flexShrink: 0,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${alpha(
              COLORS.primary,
              0.15
            )}, transparent)`,
          },
        }}
      >
        {buttons ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              flexWrap: { xs: "wrap", sm: "nowrap" },
              justifyContent: "flex-end",
            }}
          >
            {buttons}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              justifyContent: "flex-end",
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                color: COLORS.secondary,
                borderColor: alpha(COLORS.secondary, 0.3),
                backgroundColor: alpha(COLORS.secondary, 0.08),
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: 600,
                fontSize: "0.875rem",
                transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
                minWidth: { xs: "120px", sm: "140px" },
                "&:hover": {
                  backgroundColor: alpha(COLORS.secondary, 0.15),
                  borderColor: alpha(COLORS.secondary, 0.5),
                  color: "#374151",
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 25px ${alpha(COLORS.secondary, 0.15)}`,
                },
                "&:active": {
                  transform: "translateY(0)",
                },
              }}
            >
              Cancelar
            </Button>
            {onConfirm && (
              <Button
                variant="contained"
                onClick={onConfirm}
                sx={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, #1d4ed8 100%)`,
                  color: "white",
                  borderRadius: "12px",
                  padding: "12px 28px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
                  boxShadow: `0 4px 14px ${alpha(COLORS.primary, 0.4)}`,
                  minWidth: { xs: "120px", sm: "140px" },
                  "&:hover": {
                    background: `linear-gradient(135deg, #2563eb 0%, #1e40af 100%)`,
                    transform: "translateY(-2px)",
                    boxShadow: `0 12px 30px ${alpha(COLORS.primary, 0.5)}`,
                  },
                  "&:active": {
                    transform: "translateY(0)",
                    boxShadow: `0 4px 14px ${alpha(COLORS.primary, 0.4)}`,
                  },
                }}
              >
                Confirmar
              </Button>
            )}
          </Box>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

export default Modal;

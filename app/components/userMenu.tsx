"use client";
import { Sun, Moon, LogOut, Settings, HelpCircle, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import { BusinessData, UserMenuProps } from "../lib/types/types";
import Input from "./Input";
// Material-UI imports
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Divider,
  Button as MuiButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useBusinessData } from "../context/BusinessDataContext";

// Styled components
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  width: 32,
  height: 32,
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[100],
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[800]
        : theme.palette.action.hover,
  },
  "&:first-of-type": {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  "&:last-of-type": {
    borderBottomLeftRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
  },
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[4],
    borderRadius: theme.shape.borderRadius,
    minWidth: 192,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

// Styled Button para mantener consistencia con tu diseño
const StyledButton = styled(MuiButton)(({ theme }) => ({
  textTransform: "none",
  borderRadius: theme.shape.borderRadius,
  fontWeight: 600,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: theme.shadows[2],
  },
}));

const UserMenu: React.FC<UserMenuProps> = ({
  theme: currentTheme,
  handleTheme,
  handleCloseSession,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isTicketDataModalOpen, setIsTicketDataModalOpen] = useState(false);
  const { businessData, setBusinessData } = useBusinessData();
  const [localBusinessData, setLocalBusinessData] = useState<BusinessData>({
    name: "",
    address: "",
    phone: "",
    cuit: "",
  });

  const theme = useTheme();
  const isMenuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  useEffect(() => {
    if (isTicketDataModalOpen && businessData) {
      setLocalBusinessData(businessData);
    }
  }, [isTicketDataModalOpen, businessData]);

  // Nueva función adaptada para el Input component
  const handleInputChange =
    (field: keyof BusinessData) => (value: string | number) => {
      setLocalBusinessData((prev) => ({
        ...prev,
        [field]: value.toString(), // Convertir a string siempre
      }));
    };

  const saveBusinessData = async () => {
    try {
      await setBusinessData(localBusinessData);
      setIsTicketDataModalOpen(false);
      handleMenuClose();
    } catch (error) {
      console.error("Error al guardar los datos del negocio:", error);
    }
  };

  const handleThemeToggle = () => {
    handleTheme();
    handleMenuClose();
  };

  const handleTutorialClick = () => {
    window.open(
      "https://www.youtube.com/playlist?list=PLULlGP-Fw51Z5Xl-DEGMEK2Qeuzl7ceup",
      "_blank"
    );
    handleMenuClose();
  };

  const handleLogout = () => {
    handleCloseSession();
    handleMenuClose();
  };

  // Manejar la tecla Enter en el modal
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isTicketDataModalOpen) {
        saveBusinessData();
      }
    };

    if (isTicketDataModalOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isTicketDataModalOpen, localBusinessData]);

  return (
    <Box sx={{ position: "relative" }}>
      {/* Botón de usuario */}
      <StyledIconButton
        onClick={handleMenuOpen}
        title="Configuraciones"
        size="small"
      >
        <Settings
          style={{
            width: 18,
            height: 18,
            color: theme.palette.text.primary,
          }}
        />
      </StyledIconButton>

      {/* Menú desplegable */}
      <StyledMenu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{ mt: 1 }}
      >
        {/* Tema */}
        <StyledMenuItem onClick={handleThemeToggle}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {currentTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">
              {currentTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}
            </Typography>
          </ListItemText>
        </StyledMenuItem>

        {/* Datos del negocio */}
        <StyledMenuItem onClick={() => setIsTicketDataModalOpen(true)}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Ticket size={18} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Datos del negocio</Typography>
          </ListItemText>
        </StyledMenuItem>

        {/* Tutoriales */}
        <StyledMenuItem onClick={handleTutorialClick}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HelpCircle size={18} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Tutoriales</Typography>
          </ListItemText>
        </StyledMenuItem>

        <Divider />

        {/* Cerrar sesión */}
        <StyledMenuItem onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogOut size={18} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Cerrar sesión</Typography>
          </ListItemText>
        </StyledMenuItem>
      </StyledMenu>

      {/* Modal de datos del negocio */}
      <Dialog
        open={isTicketDataModalOpen}
        onClose={() => setIsTicketDataModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            Datos del negocio
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Input
              label="Nombre del Negocio"
              name="name"
              value={localBusinessData.name}
              onChange={handleInputChange("name")}
              placeholder="Ingrese el nombre del negocio"
            />
            <Input
              label="Dirección"
              name="address"
              value={localBusinessData.address}
              onChange={handleInputChange("address")}
              placeholder="Ingrese la dirección"
            />
            <Input
              label="Teléfono"
              name="phone"
              value={localBusinessData.phone}
              onChange={handleInputChange("phone")}
              placeholder="Ingrese el teléfono"
            />
            <Input
              label="CUIT"
              name="cuit"
              value={localBusinessData.cuit}
              onChange={handleInputChange("cuit")}
              placeholder="Ingrese el CUIT"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <StyledButton
            variant="outlined"
            onClick={() => setIsTicketDataModalOpen(false)}
            sx={{
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
              },
            }}
          >
            Cancelar
          </StyledButton>
          <StyledButton
            variant="contained"
            onClick={saveBusinessData}
            sx={{
              backgroundColor: theme.palette.primary.main,
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Guardar
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserMenu;

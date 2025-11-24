"use client";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";
import logo from "../../public/logo.png";
import { useRubro } from "../context/RubroContext";
import NotificationIcon from "./Notifications/NotificationIcon";

// Material-UI imports
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const rubroOptions = [
  { value: "Todos los rubros", label: "Todos los rubros" },
  { value: "comercio", label: "Comercio" },
  { value: "indumentaria", label: "Indumentaria" },
];

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: "all 0.3s ease",
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const LogoImage = styled(Image)({
  borderRadius: "50%",
  objectFit: "cover",
});

const RubroContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(0.5),
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  minWidth: 160,
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
    backgroundColor: theme.palette.background.paper,
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
  },
  [theme.breakpoints.down("sm")]: {
    minWidth: 140,
  },
}));

const NavbarContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  [theme.breakpoints.down("md")]: {
    gap: theme.spacing(2),
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen } = useSidebar();
  const { rubro, setRubro } = useRubro();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  // Tipo correcto para el evento del Select
  const handleRubroChange = (event: SelectChangeEvent<string>) => {
    setRubro(
      event.target.value as "Todos los rubros" | "comercio" | "indumentaria"
    );
  };

  return (
    <StyledAppBar
      position="fixed"
      sx={{
        width: isSidebarOpen ? "calc(100% - 256px)" : "calc(100% - 120px)",
        left: isSidebarOpen ? 256 : 120,
        transition: muiTheme.transitions.create(["width", "left"], {
          duration: muiTheme.transitions.duration.standard,
        }),
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          padding: muiTheme.spacing(1, 3),
          minHeight: "64px !important",
          [muiTheme.breakpoints.down("sm")]: {
            padding: muiTheme.spacing(1, 2),
          },
        }}
      >
        {/* Logo y título */}
        <LogoContainer>
          <LogoImage src={logo} alt="User Logo" width={32} height={32} />
          <Box>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
                fontSize: isMobile ? "0.9rem" : "1rem",
                lineHeight: 1.2,
              }}
            >
              Universal App
              <Typography
                component="span"
                sx={{
                  textTransform: "uppercase",
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  fontWeight: "bold",
                  color: "primary.main",
                  marginLeft: 1,
                }}
              >
                | {rubro}
              </Typography>
            </Typography>
          </Box>
        </LogoContainer>

        {/* Controles del lado derecho */}
        <NavbarContainer>
          {/* Selector de rubro */}
          <RubroContainer>
            <StyledFormControl size="small" variant="outlined">
              <InputLabel id="rubro-select-label">Rubro</InputLabel>
              <Select
                labelId="rubro-select-label"
                value={rubro}
                onChange={handleRubroChange}
                label="Rubro"
                sx={{
                  fontSize: "0.875rem",
                }}
              >
                {rubroOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{ fontSize: "0.875rem" }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControl>
          </RubroContainer>

          {/* Icono de notificaciones */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <NotificationIcon />
          </Box>

          {/* Menú de usuario */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <UserMenu
              theme={theme}
              handleTheme={handleTheme}
              handleCloseSession={handleCloseSession}
            />
          </Box>
        </NavbarContainer>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Navbar;

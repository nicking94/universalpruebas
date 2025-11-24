"use client";
import {
  MenuIcon,
  XIcon,
  Package,
  ShoppingCart,
  Repeat,
  Wallet,
  Headphones,
  Users,
  Truck,
  LineChart,
  ClipboardList,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { MenuItemProps, SidebarProps } from "../lib/types/types";
import { useEffect, useState } from "react";

import { TbCashRegister } from "react-icons/tb";

// Material-UI imports
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const menuItems: MenuItemProps[] = [
  {
    label: "Caja diaria",
    href: "/caja-diaria",
    icon: <TbCashRegister className="w-6 h-6" />,
  },
  {
    label: "Punto de venta",
    icon: <ShoppingCart />,
    submenu: [
      {
        label: "Ventas",
        href: "/ventas",
        icon: <ShoppingCart className="w-5 h-5" />,
      },
      {
        label: "Promociones",
        href: "/promociones",
        icon: <Tag className="w-5 h-5" />,
      },
    ],
  },
  { label: "Productos", href: "/productos", icon: <Package /> },
  { label: "Clientes", href: "/clientes", icon: <Users /> },
  { label: "Cuentas Corrientes", href: "/cuentascorrientes", icon: <Wallet /> },
  { label: "Proveedores", href: "/proveedores", icon: <Truck /> },
  { label: "Presupuestos", href: "/presupuestos", icon: <ClipboardList /> },
  { label: "Movimientos", href: "/movimientos", icon: <Repeat /> },
  { label: "Métricas", href: "/metricas", icon: <LineChart /> },
  {
    label: "Soporte técnico",
    href: "https://wa.me/5492613077147",
    icon: <Headphones />,
    target: "_blank",
  },
];

// Styled components - SIN isSidebarOpen aquí
const MenuHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1, 2),
  boxShadow: theme.shadows[1],
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "isActive" && prop !== "hasSubmenu",
})<{ isActive?: boolean; hasSubmenu?: boolean }>(
  ({ theme, isActive, hasSubmenu }) => ({
    margin: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    ...(isActive && {
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
      color: theme.palette.common.white,
      boxShadow: theme.shadows[2],
      "&:hover": {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`,
      },
    }),
    ...(hasSubmenu && {
      "& .MuiListItemText-root": {
        flex: 1,
      },
    }),
  })
);

const SubmenuContainer = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(3),
  borderLeft: `2px solid ${theme.palette.primary.main}`,
  paddingLeft: theme.spacing(1),
}));

const ImportExportButton = styled(Button)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.common.white,
  textTransform: "uppercase",
  fontSize: "0.75rem",
  fontWeight: "bold",
  padding: theme.spacing(1),
  "&:hover": {
    backgroundColor: theme.palette.primary.main,
  },
  [theme.breakpoints.up("xl")]: {
    fontSize: "0.8rem",
  },
}));

const Sidebar: React.FC<SidebarProps> = ({ items = menuItems }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Mover SidebarDrawer DENTRO del componente para acceder a isSidebarOpen
  const SidebarDrawer = styled(Drawer)(({ theme }) => ({
    "& .MuiDrawer-paper": {
      backgroundColor: theme.palette.background.paper,
      borderRight: `1px solid ${theme.palette.divider}`,
      boxShadow: theme.shadows[4],
      overflowY: "auto",
      transition: "all 0.3s ease",
      width: isSidebarOpen ? 256 : 120, // 256px abierto, 120px cerrado
    },
  }));

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleItemClick = (
    label: string,
    href?: string,
    target?: string,
    hasSubmenu?: boolean
  ) => {
    if (hasSubmenu && isSidebarOpen) {
      toggleSubmenu(label);
      return;
    }

    setActiveItem(label);

    if (href) {
      if (target === "_blank") {
        window.open(href, "_blank");
      } else {
        router.push(href);
      }
    }

    // Cerrar sidebar en móvil después de hacer clic
    if (isMobile) {
      toggleSidebar();
    }
  };

  useEffect(() => {
    const findActiveItem = (items: MenuItemProps[]): string => {
      for (const item of items) {
        if (item.href === pathname) return item.label;
        if (item.submenu) {
          const subItem = item.submenu.find((sub) => sub.href === pathname);
          if (subItem) return subItem.label;
        }
      }
      return "";
    };

    setActiveItem(findActiveItem(items));
  }, [pathname, items]);

  const renderMenuItem = (item: MenuItemProps, level = 0) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenus.has(item.label);
    const isActive =
      activeItem === item.label ||
      item.submenu?.some((subItem) => activeItem === subItem.label);

    return (
      <Box key={item.label} sx={{ width: "100%" }}>
        <ListItem disablePadding>
          <StyledListItemButton
            isActive={isActive}
            hasSubmenu={hasSubmenu}
            onClick={() =>
              handleItemClick(item.label, item.href, item.target, hasSubmenu)
            }
            sx={{
              pl: 2 + level * 2,
              justifyContent: isSidebarOpen ? "flex-start" : "center",
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto",
                color: isActive ? "common.white" : "text.primary",
                mr: isSidebarOpen ? 2 : 0,
              }}
            >
              {item.icon}
            </ListItemIcon>

            {isSidebarOpen && (
              <>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ flex: 1 }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
                {hasSubmenu && (
                  <Box sx={{ ml: 1 }}>
                    {isSubmenuOpen ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </Box>
                )}
              </>
            )}
          </StyledListItemButton>
        </ListItem>

        {hasSubmenu && isSubmenuOpen && isSidebarOpen && item.submenu && (
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <SubmenuContainer>
              <List disablePadding>
                {item.submenu.map((subItem) => (
                  <Box key={subItem.label}>
                    {renderMenuItem(subItem, level + 1)}
                  </Box>
                ))}
              </List>
            </SubmenuContainer>
          </Collapse>
        )}
      </Box>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        justifyContent: "space-between",
      }}
    >
      {/* Header y Navegación */}
      <Box>
        <MenuHeader>
          <Typography variant="subtitle1" fontWeight="medium">
            Menú
          </Typography>
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{
              color: "common.white",
              "&:hover": {
                backgroundColor: "primary.main",
              },
            }}
            title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isSidebarOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </IconButton>
        </MenuHeader>

        <List sx={{ pt: 0.5 }}>
          {items.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      {/* Botón Importar/Exportar */}
      {isSidebarOpen && (
        <Box sx={{ p: 2 }}>
          <ImportExportButton
            onClick={() => router.push("/import-export")}
            startIcon={<Repeat size={14} />}
          >
            Importar | Exportar
          </ImportExportButton>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <SidebarDrawer
        variant="permanent"
        sx={{
          width: isSidebarOpen ? 256 : 120,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isSidebarOpen ? 256 : 120,
            boxSizing: "border-box",
          },
          display: { xs: "none", md: "block" },
        }}
      >
        {drawerContent}
      </SidebarDrawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={isSidebarOpen}
        onClose={toggleSidebar}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 256,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;

// app/theme/theme.ts
"use client";
import { createTheme } from "@mui/material/styles";

const colors = {
  black: "#141414",
  gray_xxl: "#f3f4f6",
  gray_xl: "#d1d5db",
  gray_l: "#7c7c7c",
  gray_m: "#4c4c4c",
  gray_b: "#2c2c2c",
  blue_xl: "#eaf6ff",
  blue_l: "#85c1e9",
  blue_m: "#268ed4",
  blue_b: "#2d78b9",
  green_xl: "#f0fff4",
  green_l: "#a3e4d7",
  green_m: "#2ecc71",
  green_b: "#1e8449",
  red_xl: "#fff5f5",
  red_l: "#f2dede",
  red_m: "#e74c3c",
  red_b: "#c0392b",
  yellow_xl: "#fffbe6",
  yellow_l: "#fff9c4",
  yellow_m: "#f1c40f",
  yellow_b: "#f39c12",
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.blue_m, // #268ed4
      dark: colors.blue_b, // #2d78b9
      light: colors.blue_l, // #85c1e9
    },
    secondary: {
      main: colors.gray_m, // #4c4c4c
      dark: colors.gray_b, // #2c2c2c
      light: colors.gray_l, // #7c7c7c
    },
    success: {
      main: colors.green_m, // #2ecc71
      dark: colors.green_b, // #1e8449
      light: colors.green_l, // #a3e4d7
    },
    error: {
      main: colors.red_m, // #e74c3c
      dark: colors.red_b, // #c0392b
      light: colors.red_l, // #f2dede
    },
    warning: {
      main: colors.yellow_m, // #f1c40f
      dark: colors.yellow_b, // #f39c12
      light: colors.yellow_l, // #fff9c4
    },
    background: {
      default: colors.gray_xxl, // #f3f4f6
      paper: "#ffffff",
    },
    text: {
      primary: colors.gray_b, // #2c2c2c
      secondary: colors.gray_m, // #4c4c4c
    },
    grey: {
      50: colors.gray_xxl, // #f3f4f6
      100: colors.gray_xl, // #d1d5db
      500: colors.gray_l, // #7c7c7c
      700: colors.gray_m, // #4c4c4c
      900: colors.gray_b, // #2c2c2c
    },

    profit: {
      main: "#8b5cf6", // Violeta vibrante
      light: "#a78bfa", // Violeta claro
      dark: "#7c3aed", // Violeta oscuro
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 10, // Coherente con --radius: 0.625rem (10px)
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.blue_m, // #268ed4
      dark: colors.blue_b, // #2d78b9
      light: colors.blue_l, // #85c1e9
    },
    secondary: {
      main: colors.gray_xl, // #d1d5db
      dark: colors.gray_l, // #7c7c7c
      light: colors.gray_xxl, // #f3f4f6
    },
    success: {
      main: colors.green_m, // #2ecc71
      dark: colors.green_b, // #1e8449
      light: colors.green_l, // #a3e4d7
    },
    error: {
      main: colors.red_m, // #e74c3c
      dark: colors.red_b, // #c0392b
      light: colors.red_l, // #f2dede
    },
    warning: {
      main: colors.yellow_m, // #f1c40f
      dark: colors.yellow_b, // #f39c12
      light: colors.yellow_l, // #fff9c4
    },
    background: {
      default: colors.black, // #141414
      paper: colors.gray_b, // #2c2c2c
    },
    text: {
      primary: colors.gray_xxl, // #f3f4f6
      secondary: colors.gray_xl, // #d1d5db
    },
    grey: {
      50: colors.gray_b, // #2c2c2c
      100: colors.gray_m, // #4c4c4c
      500: colors.gray_l, // #7c7c7c
      700: colors.gray_xl, // #d1d5db
      900: colors.gray_xxl, // #f3f4f6
    },

    profit: {
      main: "#a78bfa", // Violeta más claro para dark mode
      light: "#c4b5fd", // Violeta aún más claro
      dark: "#8b5cf6", // Violeta original
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 10, // Coherente con --radius: 0.625rem (10px)
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
          backgroundColor: colors.gray_b, // #2c2c2c
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: colors.gray_m, // #4c4c4c
            color: colors.gray_xxl, // #f3f4f6
            fontWeight: "bold",
          },
        },
      },
    },
  },
});

// Extender la paleta de Material-UI para incluir el color profit
declare module "@mui/material/styles" {
  interface Palette {
    profit: Palette["primary"];
  }
  interface PaletteOptions {
    profit?: PaletteOptions["primary"];
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    profit: true;
  }
}

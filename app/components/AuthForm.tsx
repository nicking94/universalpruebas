"use client";
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Link,
  InputAdornment,
  IconButton,
  Paper,
  useTheme,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { AuthData } from "../lib/types/types";
import Image from "next/image";
import Logo from "../../public/logo.png";

interface AuthFormProps {
  type?: "login" | "register";
  onSubmit: (data: AuthData) => void;
  showTermsCheckbox?: boolean;
  acceptedTerms?: boolean;
  onTermsCheckboxChange?: (accepted: boolean) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  type = "login",
  onSubmit,
  showTermsCheckbox = false,
  acceptedTerms = false,
  onTermsCheckboxChange,
}) => {
  const [formData, setFormData] = useState<AuthData>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (showTermsCheckbox && !acceptedTerms) {
      return;
    }
    onSubmit(formData);
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onTermsCheckboxChange) {
      onTermsCheckboxChange(e.target.checked);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={8}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: { xs: "90%", sm: "70%", md: "35%", xl: "25%" },
        p: 5,
        gap: 3,
        backgroundColor: "#e0f2fe", // bg-blue_xl equivalent
        color: "#374151", // text-gray_b equivalent
        zIndex: 40,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "none", justifyContent: "center" }}>
        <Image src={Logo} alt="logo" width={100} height={100} />
      </Box>

      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 600,
          textAlign: "center",
          color: "#374151",
          fontSize: { xs: "1.875rem", lg: "2.25rem" },
        }}
      >
        {type === "login" ? "Iniciar sesión" : "Registrarse"}
      </Typography>

      <TextField
        label="Usuario"
        id="username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        required
        placeholder="Escribe tu nombre de usuario"
        variant="outlined"
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
            "&:hover fieldset": {
              borderColor: theme.palette.primary.light,
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
      />

      <TextField
        label="Contraseña"
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={handleChange}
        required
        placeholder="Escribe tu contraseña"
        variant="outlined"
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={handleClickShowPassword}
                edge="end"
                sx={{ color: "text.secondary" }}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
            "&:hover fieldset": {
              borderColor: theme.palette.primary.light,
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
      />

      {showTermsCheckbox && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={handleTermsChange}
                sx={{
                  color: theme.palette.primary.main,
                  "&.Mui-checked": {
                    color: theme.palette.primary.main,
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: "text.primary" }}>
                Acepto los términos y condiciones
              </Typography>
            }
          />
          <Link
            href="/terminos-y-condiciones"
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
              fontSize: "0.75rem",
            }}
          >
            Leer términos y condiciones
          </Link>
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={showTermsCheckbox && !acceptedTerms}
          fullWidth
          sx={{
            py: 1.5,
            fontSize: "1rem",
            fontWeight: 600,
            backgroundColor: theme.palette.primary.main,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
            "&:disabled": {
              backgroundColor: theme.palette.action.disabled,
            },
          }}
        >
          {type === "login" ? "Iniciar Sesión" : "Registrarse"}
        </Button>
      </Box>
    </Paper>
  );
};

export default AuthForm;

"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { SearchBarProps } from "../lib/types/types";
import { TextField, InputAdornment, Box, useTheme, alpha } from "@mui/material";

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const theme = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <Box
      sx={{
        maxWidth: "20rem",
        width: "100%",
        height: { xs: "2rem", xl: "auto" },
      }}
    >
      <TextField
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={handleChange}
        fullWidth
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} color={theme.palette.text.secondary} />
            </InputAdornment>
          ),
          sx: {
            borderRadius: "4px",
            backgroundColor: "white",
            "&:hover": {
              backgroundColor: "white",
              borderColor: theme.palette.primary.main,
            },
            "&.Mui-focused": {
              backgroundColor: "white",
              borderColor: theme.palette.primary.main,
              boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.grey[400],
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
              borderWidth: "1px",
            },
          },
        }}
        sx={{
          "& .MuiInputBase-input": {
            color: theme.palette.text.primary,
            "&::placeholder": {
              color: theme.palette.text.secondary,
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  );
};

export default SearchBar;

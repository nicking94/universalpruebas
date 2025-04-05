"use client";
import { useState } from "react";
import { Search } from "lucide-react"; // Importa el ícono de búsqueda
import { SearchBarProps } from "../lib/types/types";

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="h-[2rem] 2xl:h-auto max-w-[26rem] flex items-center w-full bg-white p-2 rounded-sm placeholder:text-gray_l  outline-none text-gray_b">
      {/* Icono de búsqueda */}
      <Search className="text-gray-500 dark:text-gray-400 mr-2" />

      {/* Input de búsqueda */}
      <input
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={handleChange}
        className="w-full  dark:bg-white  dark:text-gray_b placeholder:text-gray_l dark:placeholder:text-gray_l outline-none"
      />
    </div>
  );
};

export default SearchBar;

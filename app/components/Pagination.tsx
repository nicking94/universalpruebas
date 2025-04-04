"use client";

import React from "react";
import { PaginationProps } from "../lib/types/types";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Importar los íconos

const Pagination: React.FC<PaginationProps> = ({
  text = "Productos por página",
  text2 = "Total de productos",
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between mt-4">
      {/* Selección de productos por página */}
      <div className="flex items-center">
        <p className="text-gray_m dark:text-white mr-2">{text}</p>
        <select
          className="cursor-pointer bg-white dark:bg-gray_b border border-gray_l rounded p-1 text-gray_b dark:text-white outline-none"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="30">30</option>
        </select>
      </div>

      {/* Navegación de páginas */}
      <nav className="flex justify-center">
        <ul className="flex space-x-2">
          {/* Botón para ir al principio */}
          <li>
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={`flex items-center justify-center  py-2 text-black dark:text-white  ${
                currentPage === 1 ? " opacity-30" : " cursor-pointer"
              }`}
            >
              <ChevronLeft size={24} />
            </button>
          </li>

          {/* Números de páginas */}
          {pageNumbers.map((number) => (
            <li key={number}>
              <button
                onClick={() => onPageChange(number)}
                className={`cursor-pointer px-4 py-2 rounded-sm ${
                  currentPage === number
                    ? "bg-blue_m text-white font-bold"
                    : "bg-white text-gray_l hover:bg-blue_xl font-semibold"
                }`}
              >
                {number}
              </button>
            </li>
          ))}

          {/* Botón para ir al final */}
          <li>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center  py-2 text-black dark:text-white ${
                currentPage === totalPages ? " opacity-30" : " cursor-pointer "
              }`}
            >
              <ChevronRight size={24} />
            </button>
          </li>
        </ul>
      </nav>

      {/* Total de productos */}
      <div>
        <span className="text-gray_m dark:text-white">
          {text2}: {totalItems}
        </span>
      </div>
    </div>
  );
};

export default Pagination;

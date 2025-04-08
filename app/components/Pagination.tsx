"use client";

import React from "react";
import { PaginationProps } from "../lib/types/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const getPageNumbers = () => {
    const maxButtons = 5;
    const pages: (number | "...")[] = [];

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(currentPage - 1, 2);
      const right = Math.min(currentPage + 1, totalPages - 1);

      pages.push(1); // Siempre mostrar la primera

      if (left > 2) pages.push("...");

      for (let i = left; i <= right; i++) {
        pages.push(i);
      }

      if (right < totalPages - 1) pages.push("...");

      pages.push(totalPages); // Siempre mostrar la última
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between  flex-wrap gap-4 ">
      {/* Selección de productos por página */}
      <div className="flex items-center">
        <p className="text-gray_m dark:text-white mr-2">{text}</p>
        <select
          className="cursor-pointer bg-white dark:bg-gray_b border border-gray_l rounded p-1 text-gray_b dark:text-white outline-none"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          {[5, 10, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Paginación */}
      <nav className="flex justify-center">
        <ul className="flex items-center space-x-2">
          {/* Botón anterior */}
          <li>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`cursor-pointer p-2 text-black dark:text-white ${
                currentPage === 1 ? "opacity-30" : "cursor-pointer"
              }`}
            >
              <ChevronLeft size={24} />
            </button>
          </li>

          {/* Botones de páginas */}
          {pageNumbers.map((number, index) => (
            <li key={index}>
              {number === "..." ? (
                <span className="px-2 text-gray_l">...</span>
              ) : (
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
              )}
            </li>
          ))}

          {/* Botón siguiente */}
          <li>
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className={`cursor-pointer p-2 text-black dark:text-white ${
                currentPage === totalPages ? "opacity-30" : "cursor-pointer"
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

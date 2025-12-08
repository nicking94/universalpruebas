"use client";

import React, { useMemo, useCallback } from "react";
import { PaginationProps } from "../lib/types/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "@/app/database/db";
import { usePagination } from "../context/PaginationContext";
import {
  Box,
  Pagination as MuiPagination,
  PaginationItem,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { PaginationRenderItemParams } from "@mui/material/Pagination";
import Select, { SelectOption } from "./Select"; // Ajusta la ruta según sea necesario

const Pagination: React.FC<
  Omit<
    PaginationProps,
    "onPageChange" | "onItemsPerPageChange" | "currentPage" | "itemsPerPage"
  > & {
    text?: string;
    text2?: string;
    totalItems: number;
  }
> = ({
  text = "Productos por página",
  text2 = "Total de productos",
  totalItems,
}) => {
  const { userId } = useAuth();
  const {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    isLoading,
  } = usePagination();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  const handlePrevious = useCallback(() => {
    setCurrentPage(Math.max(1, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const handleNext = useCallback(() => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, setCurrentPage]);

  const handleItemsPerPageChange = useCallback(
    async (newItemsPerPage: number) => {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);

      if (userId) {
        try {
          const existingPrefs = await db.userPreferences
            .where("userId")
            .equals(userId)
            .first();

          if (existingPrefs) {
            await db.userPreferences.update(existingPrefs.id!, {
              itemsPerPage: newItemsPerPage,
            });
          } else {
            await db.userPreferences.add({
              userId,
              acceptedTerms: false,
              itemsPerPage: newItemsPerPage,
            });
          }
        } catch (error) {
          console.error("Error al guardar la preferencia:", error);
        }
      }
    },
    [setItemsPerPage, userId, setCurrentPage]
  );

  const handlePageChange = useCallback(
    (event: React.ChangeEvent<unknown>, page: number) => {
      if (page !== currentPage) {
        setCurrentPage(page);
      }
    },
    [currentPage, setCurrentPage]
  );

  // Opciones para el Select personalizado
  const itemsPerPageOptions: SelectOption<number>[] = useMemo(
    () => [
      { value: 5, label: "5" },
      { value: 10, label: "10" },
      { value: 20, label: "20" },
      { value: 30, label: "30" },
    ],
    []
  );

  // Función para renderizar los botones de paginación personalizados
  const renderPaginationItem = (item: PaginationRenderItemParams) => {
    if (item.type === "previous") {
      return (
        <PaginationItem
          {...item}
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </PaginationItem>
      );
    }

    if (item.type === "next") {
      return (
        <PaginationItem
          {...item}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </PaginationItem>
      );
    }

    return <PaginationItem {...item} />;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Cargando preferencias...
        </Typography>
      </Box>
    );
  }

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      {/* Selector de items por página */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
        <Select<number>
          label="Items"
          options={itemsPerPageOptions}
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          size="small"
          sx={{
            minWidth: 80,
            "& .MuiOutlinedInput-root": {
              height: 40,
            },
          }}
        />
      </Stack>

      {/* Paginación */}
      <Box>
        <MuiPagination
          page={currentPage}
          count={totalPages}
          onChange={handlePageChange}
          renderItem={renderPaginationItem}
          size={isMobile ? "small" : "medium"}
          siblingCount={1}
          boundaryCount={1}
          showFirstButton
          showLastButton
          sx={{
            "& .MuiPaginationItem-root": {
              margin: "0 2px",
              color: "text.primary",
              backgroundColor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 32,
              height: 32,
              borderRadius: theme.shape.borderRadius,
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "primary.light",
              },
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                borderColor: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.dark",
                  borderColor: "primary.dark",
                },
              },
              "&.Mui-disabled": {
                color: "text.disabled",
                backgroundColor: "action.disabledBackground",
                borderColor: "divider",
              },
              "& .MuiSvgIcon-root": {
                color: "inherit",
              },
            },
            "& .MuiPaginationItem-firstLast, & .MuiPaginationItem-previousNext":
              {
                backgroundColor: "background.paper",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                "&.Mui-disabled": {
                  backgroundColor: "action.disabledBackground",
                },
              },
          }}
        />
      </Box>

      {/* Contador total */}
      <Typography variant="body2" color="text.secondary">
        {text2}:{" "}
        <Typography
          component="span"
          fontWeight="medium"
          variant="body2"
          color="primary.main"
          sx={{
            backgroundColor: "background.paper",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            mx: 0.5,
          }}
        >
          {totalItems}
        </Typography>
      </Typography>
    </Stack>
  );
};

export default React.memo(Pagination);

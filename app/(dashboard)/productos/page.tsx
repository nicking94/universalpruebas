"use client";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  ClothingSizeOption,
  DailyCashMovement,
  Product,
  ProductReturn,
  Rubro,
  UnifiedFilter,
  UnitOption,
} from "@/app/lib/types/types";
import {
  Info,
  Edit,
  Delete,
  Inventory2,
  Warning,
  QrCode,
  Add,
} from "@mui/icons-material";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { db } from "@/app/database/db";
import SearchBar from "@/app/components/SearchBar";
import { parseISO, format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { isValid } from "date-fns";
import { formatCurrency } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { usePagination } from "@/app/context/PaginationContext";
import BarcodeGenerator from "@/app/components/BarcodeGenerator";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import Select from "@/app/components/Select";
import {
  convertFromBaseUnit,
  convertToBaseUnit,
} from "@/app/lib/utils/calculations";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import Checkbox from "@/app/components/Checkbox";
import {
  Autocomplete,
  IconButton,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import Input from "@/app/components/Input";
import Button from "@/app/components/Button";

// Constantes de configuración
const PRODUCT_CONFIG = {
  MAX_PRODUCTS_PER_CATEGORY: 30,
  IVA_PERCENTAGE: 21,
  DEFAULT_UNIT: "Unid.",
  NOTIFICATION_DURATION: 2500,
} as const;

const CONVERSION_FACTORS = {
  Gr: { base: "Kg", factor: 0.001 },
  Kg: { base: "Kg", factor: 1 },
  Ton: { base: "Kg", factor: 1000 },
  Ml: { base: "L", factor: 0.001 },
  L: { base: "L", factor: 1 },
  Mm: { base: "M", factor: 0.001 },
  Cm: { base: "M", factor: 0.01 },
  Pulg: { base: "M", factor: 0.0254 },
  M: { base: "M", factor: 1 },
  "Unid.": { base: "Unid.", factor: 1 },
  Docena: { base: "Unid.", factor: 12 },
  Ciento: { base: "Unid.", factor: 100 },
  Bulto: { base: "Bulto", factor: 1 },
  Caja: { base: "Caja", factor: 1 },
  Cajón: { base: "Cajón", factor: 1 },
  "M²": { base: "M²", factor: 1 },
  "M³": { base: "M³", factor: 1 },
  V: { base: "V", factor: 1 },
  A: { base: "A", factor: 1 },
  W: { base: "W", factor: 1 },
} as const;

const unitOptions: UnitOption[] = [
  { value: "Unid.", label: "Unidad", convertible: false },
  { value: "Kg", label: "Kilogramo", convertible: true },
  { value: "Gr", label: "Gramo", convertible: true },
  { value: "L", label: "Litro", convertible: true },
  { value: "Ml", label: "Mililitro", convertible: true },
  { value: "Mm", label: "Milímetro", convertible: true },
  { value: "Cm", label: "Centímetro", convertible: true },
  { value: "M", label: "Metro", convertible: true },
  { value: "M²", label: "Metro cuadrado", convertible: true },
  { value: "M³", label: "Metro cúbico", convertible: true },
  { value: "Pulg", label: "Pulgada", convertible: true },
  { value: "Docena", label: "Docena", convertible: false },
  { value: "Ciento", label: "Ciento", convertible: false },
  { value: "Ton", label: "Tonelada", convertible: true },
  { value: "V", label: "Voltio", convertible: false },
  { value: "A", label: "Amperio", convertible: false },
  { value: "W", label: "Watt", convertible: false },
  { value: "Bulto", label: "Bulto", convertible: false },
  { value: "Caja", label: "Caja", convertible: false },
  { value: "Cajón", label: "Cajón", convertible: false },
];

const seasonOptions = [
  { value: "todo el año", label: "Todo el año" },
  { value: "invierno", label: "Invierno" },
  { value: "otoño", label: "Otoño" },
  { value: "primavera", label: "Primavera" },
  { value: "verano", label: "Verano" },
];

// Custom hooks
const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const storedProducts = await db.products.toArray();
      const formattedProducts = storedProducts
        .map((p: Product) => ({
          ...p,
          id: Number(p.id),
          customCategories: (p.customCategories || []).filter(
            (cat) => cat.name && cat.name.trim()
          ),
        }))
        .sort((a, b) => b.id - a.id);

      setProducts(formattedProducts);
      return formattedProducts;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (product: Product) => {
    const { ...productWithoutId } = product;
    const newId = await db.products.add(productWithoutId);
    const newProduct = { ...product, id: Number(newId) };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  }, []);

  const updateProduct = useCallback(
    async (id: number, updates: Partial<Product>) => {
      await db.products.update(id, updates);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const deleteProduct = useCallback(async (id: number) => {
    await db.products.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    setProducts,
  };
};

const useProductValidation = () => {
  const validateProduct = useCallback((product: Product): string[] => {
    const errors: string[] = [];

    if (!product.name?.trim()) errors.push("El nombre es requerido");
    if (product.stock < 0) errors.push("El stock no puede ser negativo");
    if (product.costPrice <= 0)
      errors.push("El precio de costo debe ser mayor a 0");
    if (product.price <= 0)
      errors.push("El precio de venta debe ser mayor a 0");
    if (product.price < product.costPrice) {
      errors.push("El precio de venta no puede ser menor al costo");
    }
    if (!product.unit) errors.push("La unidad de medida es requerida");
    if (!product.customCategories?.length) {
      errors.push("La categoría es requerida");
    }

    return errors;
  }, []);

  return { validateProduct };
};

const useNotification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");

  const showNotification = useCallback(
    (
      notificationMessage: string,
      notificationType: "success" | "error" | "info"
    ) => {
      setType(notificationType);
      setMessage(notificationMessage);
      setIsOpen(true);

      setTimeout(() => {
        setIsOpen(false);
      }, PRODUCT_CONFIG.NOTIFICATION_DURATION);
    },
    []
  );

  return {
    isNotificationOpen: isOpen,
    notificationMessage: message,
    notificationType: type,
    showNotification,
  };
};

// Componente para filas de productos
const ProductRow = React.memo(
  ({
    product,
    rubro,
    onEdit,
    onDelete,
    onGenerateBarcode,
    supplierName,
  }: {
    product: Product;
    rubro: Rubro;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onGenerateBarcode: (product: Product) => void;
    supplierName?: string;
  }) => {
    const expirationDate = product.expiration
      ? startOfDay(parseISO(product.expiration))
      : null;
    const today = startOfDay(new Date());

    let daysUntilExpiration = null;
    if (expirationDate) {
      daysUntilExpiration = differenceInDays(expirationDate, today);
    }

    const expiredToday = daysUntilExpiration === 0;
    const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
    const isExpiringSoon =
      daysUntilExpiration !== null &&
      daysUntilExpiration > 0 &&
      daysUntilExpiration <= 7;

    const displayName = getDisplayProductName(product, rubro, false);
    const hasLowStock =
      product.setMinStock &&
      product.minStock &&
      product.stock < product.minStock;

    return (
      <TableRow
        sx={{
          border: "1px solid",
          borderColor: "divider",
          "&:hover": { backgroundColor: "action.hover" },
          transition: "all 0.3s",
          ...(isExpired && {
            borderLeft: "2px solid",
            borderLeftColor: "error.main",
            animation: "pulse 2s infinite",
          }),
          ...(expiredToday && {
            borderLeft: "2px solid",
            borderLeftColor: "error.main",
            backgroundColor: "error.main",
            color: "white",
            "&:hover": { backgroundColor: "error.dark" },
          }),
          ...(isExpiringSoon && {
            borderLeft: "2px solid",
            borderLeftColor: "error.main",
            backgroundColor: "error.light",
            "&:hover": { backgroundColor: "error.light" },
          }),
        }}
      >
        <TableCell
          sx={{
            fontWeight: "bold",
            textAlign: "left",
            textTransform: "capitalize",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              height: "100%",
            }}
          >
            {(expiredToday || isExpiringSoon || isExpired) && (
              <Warning
                sx={{
                  color: expiredToday
                    ? "warning.main"
                    : isExpiringSoon
                    ? "warning.dark"
                    : "error.main",
                }}
                fontSize="small"
              />
            )}
            <Typography variant="body2" sx={{ lineHeight: "tight" }}>
              {displayName}
            </Typography>
          </Box>
        </TableCell>
        <TableCell
          sx={{
            textAlign: "center",
            ...(!isNaN(Number(product.stock)) && Number(product.stock) > 0
              ? hasLowStock
                ? {
                    color: "white",
                    fontWeight: "bold",
                    backgroundColor: "primary.main",
                  }
                : {}
              : { color: "error.main" }),
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ textTransform: "uppercase" }}
            >
              {!isNaN(Number(product.stock)) && Number(product.stock) > 0
                ? `${product.stock} ${product.unit}`
                : "Agotado"}
            </Typography>
            {hasLowStock && (
              <Typography
                variant="caption"
                sx={{ color: "primary.light", fontWeight: "medium", mt: 0.5 }}
              >
                Stock por debajo del mínimo
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ textAlign: "center", textTransform: "capitalize" }}>
          {product.customCategories?.[0]?.name || "-"}
        </TableCell>
        <TableCell sx={{ textAlign: "center" }}>
          {product.location || "-"}
        </TableCell>

        {rubro === "indumentaria" && (
          <>
            <TableCell sx={{ textAlign: "center" }}>
              {product.size || "-"}
            </TableCell>
            <TableCell
              sx={{ textAlign: "center", textTransform: "capitalize" }}
            >
              {product.color || "-"}
            </TableCell>
            <TableCell
              sx={{ textAlign: "center", textTransform: "capitalize" }}
            >
              {product.brand || "-"}
            </TableCell>
          </>
        )}
        <TableCell sx={{ textAlign: "center", textTransform: "capitalize" }}>
          {product.season || "-"}
        </TableCell>

        <TableCell sx={{ textAlign: "center" }}>
          {formatCurrency(product.costPrice)}
        </TableCell>
        <TableCell sx={{ textAlign: "center" }}>
          {formatCurrency(product.price)}
        </TableCell>
        {rubro !== "indumentaria" && (
          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
            {product.expiration && isValid(parseISO(product.expiration))
              ? format(parseISO(product.expiration), "dd/MM/yyyy", {
                  locale: es,
                })
              : "-"}
            {isExpiringSoon && (
              <Typography
                component="span"
                sx={{ ml: 0.5, color: "error.main" }}
              >
                (Por vencer)
              </Typography>
            )}
            {expirationDate && expiredToday && (
              <Typography
                component="span"
                sx={{ ml: 0.5, color: "white", animation: "pulse 1s infinite" }}
              >
                (Vence Hoy)
              </Typography>
            )}
            {expirationDate && isExpired && (
              <Typography
                component="span"
                sx={{ ml: 0.5, color: "error.main" }}
              >
                (Vencido)
              </Typography>
            )}
          </TableCell>
        )}
        <TableCell sx={{ textAlign: "center" }}>
          {supplierName || "-"}
        </TableCell>
        {rubro !== "Todos los rubros" && (
          <TableCell sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
              <IconButton
                onClick={() => onGenerateBarcode(product)}
                size="small"
                sx={{
                  borderRadius: "4px",
                  color: "text.secondary",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                }}
                title="Código de Barras"
              >
                <QrCode fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => onEdit(product)}
                size="small"
                sx={{
                  borderRadius: "4px",
                  color: "text.secondary",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                }}
                title="Editar Producto"
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => onDelete(product)}
                size="small"
                sx={{
                  borderRadius: "4px",
                  color: "text.secondary",
                  "&:hover": {
                    backgroundColor: "error.main",
                    color: "white",
                  },
                }}
                title="Eliminar Producto"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </TableCell>
        )}
      </TableRow>
    );
  }
);

ProductRow.displayName = "ProductRow";

const ProductsPage = () => {
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();

  // Custom hooks
  const {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    setProducts,
  } = useProducts();
  const { validateProduct } = useProductValidation();
  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
  } = useNotification();

  // Estados
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    id: Date.now(),
    name: "",
    stock: 0,
    costPrice: 0,
    price: 0,
    hasIvaIncluded: true,
    expiration: "",
    quantity: 0,
    unit: PRODUCT_CONFIG.DEFAULT_UNIT,
    barcode: "",
    category: "",
    brand: "",
    color: "",
    size: "",
    rubro: rubro,
    lot: "",
    location: "",
    customCategory: "",
    customCategories: [],
    setMinStock: false,
    minStock: 0,
  });
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Product;
    direction: "asc" | "desc";
  }>({
    field: "name",
    direction: "asc",
  });

  const [filters, setFilters] = useState<UnifiedFilter[]>([]);
  const [globalCustomCategories, setGlobalCustomCategories] = useState<
    Array<{ name: string; rubro: Rubro }>
  >([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [productSuppliers, setProductSuppliers] = useState<
    Record<number, string>
  >({});
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] =
    useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    name: string;
    rubro: Rubro;
  } | null>(null);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
    useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newColor, setNewColor] = useState("");
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedReturnProduct, setSelectedReturnProduct] =
    useState<Product | null>(null);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [showReturnsHistory, setShowReturnsHistory] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnUnit, setReturnUnit] = useState<string>("");
  const [clothingSizes, setClothingSizes] = useState<ClothingSizeOption[]>([]);
  const [newSize, setNewSize] = useState("");
  const [sizeToDelete, setSizeToDelete] = useState<string | null>(null);
  const [isSizeDeleteModalOpen, setIsSizeDeleteModalOpen] = useState(false);

  // Funciones de utilidad
  const calculatePriceWithIva = useCallback((price: number): number => {
    return price * (1 + PRODUCT_CONFIG.IVA_PERCENTAGE / 100);
  }, []);

  const calculatePriceWithoutIva = useCallback(
    (priceWithIva: number): number => {
      return priceWithIva / (1 + PRODUCT_CONFIG.IVA_PERCENTAGE / 100);
    },
    []
  );

  const loadClothingSizes = useCallback(async () => {
    try {
      const clothingProducts = await db.products
        .where("rubro")
        .equals("indumentaria")
        .toArray();

      const uniqueSizes = Array.from(
        new Set(
          clothingProducts
            .filter((product) => product.size && product.size.trim() !== "")
            .map((product) => product.size as string)
        )
      );

      const sizeOptions = uniqueSizes
        .map((size) => ({ value: size, label: size }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setClothingSizes(sizeOptions);
    } catch (error) {
      console.error("Error al cargar talles:", error);
      showNotification("Error al cargar los talles", "error");
    }
  }, [showNotification]);

  const handleIvaCheckboxChange = useCallback(
    (hasIvaIncluded: boolean) => {
      setNewProduct((prev) => {
        let newCostPrice = prev.costPrice;
        let newPrice = prev.price;

        if (hasIvaIncluded && !prev.hasIvaIncluded) {
          newCostPrice = calculatePriceWithIva(prev.costPrice);
          newPrice = calculatePriceWithIva(prev.price);
        } else if (!hasIvaIncluded && prev.hasIvaIncluded) {
          newCostPrice = calculatePriceWithoutIva(prev.costPrice);
          newPrice = calculatePriceWithoutIva(prev.price);
        }

        return {
          ...prev,
          hasIvaIncluded,
          costPrice: newCostPrice,
          price: newPrice,
          costPriceWithIva: hasIvaIncluded ? newCostPrice : prev.costPrice,
          priceWithIva: hasIvaIncluded ? newPrice : prev.price,
        };
      });
    },
    [calculatePriceWithIva, calculatePriceWithoutIva]
  );

  const loadCustomCategories = useCallback(async () => {
    try {
      const storedCategories = await db.customCategories.toArray();
      const allProducts = await db.products.toArray();
      const allCategories = new Map<string, { name: string; rubro: Rubro }>();

      storedCategories.forEach((cat) => {
        if (cat.name?.trim()) {
          const key = `${cat.name.toLowerCase().trim()}_${cat.rubro}`;
          allCategories.set(key, {
            name: cat.name.trim(),
            rubro: cat.rubro || "comercio",
          });
        }
      });

      allProducts.forEach((product: Product) => {
        if (product.customCategories?.length) {
          product.customCategories.forEach((cat) => {
            if (cat.name?.trim()) {
              const key = `${cat.name.toLowerCase().trim()}_${
                cat.rubro || product.rubro || "comercio"
              }`;
              if (!allCategories.has(key)) {
                allCategories.set(key, {
                  name: cat.name.trim(),
                  rubro: cat.rubro || product.rubro || "comercio",
                });
              }
            }
          });
        }

        if (product.category?.trim()) {
          const key = `${product.category.toLowerCase().trim()}_${
            product.rubro || "comercio"
          }`;
          if (!allCategories.has(key)) {
            allCategories.set(key, {
              name: product.category.trim(),
              rubro: product.rubro || "comercio",
            });
          }
        }
      });

      return Array.from(allCategories.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error("Error loading categories:", error);
      return [];
    }
  }, []);

  const checkProductLimit = useCallback(async (rubro: Rubro) => {
    const products = await db.products.where("rubro").equals(rubro).count();
    return products >= PRODUCT_CONFIG.MAX_PRODUCTS_PER_CATEGORY;
  }, []);

  const getCompatibleUnits = useCallback(
    (productUnit: string): UnitOption[] => {
      const productUnitInfo =
        CONVERSION_FACTORS[productUnit as keyof typeof CONVERSION_FACTORS];
      if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);

      return unitOptions.filter((option) => {
        if (!option.convertible) return false;
        const optionInfo =
          CONVERSION_FACTORS[option.value as keyof typeof CONVERSION_FACTORS];
        return optionInfo?.base === productUnitInfo.base;
      });
    },
    []
  );

  const calculateEAN13CheckDigit = useCallback((code: string): number => {
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }, []);

  const generateValidEAN13 = useCallback((): string => {
    let baseCode = "";
    for (let i = 0; i < 12; i++) {
      baseCode += Math.floor(Math.random() * 10).toString();
    }

    const checkDigit = calculateEAN13CheckDigit(baseCode);
    return baseCode + checkDigit.toString();
  }, [calculateEAN13CheckDigit]);

  const hasChanges = useCallback(
    (originalProduct: Product, updatedProduct: Product) => {
      return (
        originalProduct.name !== updatedProduct.name ||
        originalProduct.stock !== updatedProduct.stock ||
        originalProduct.costPrice !== updatedProduct.costPrice ||
        originalProduct.price !== updatedProduct.price ||
        originalProduct.hasIvaIncluded !== updatedProduct.hasIvaIncluded ||
        originalProduct.expiration !== updatedProduct.expiration ||
        originalProduct.unit !== updatedProduct.unit ||
        originalProduct.barcode !== updatedProduct.barcode ||
        originalProduct.category !== updatedProduct.category ||
        originalProduct.lot !== updatedProduct.lot ||
        originalProduct.location !== updatedProduct.location ||
        JSON.stringify(originalProduct.customCategories) !==
          JSON.stringify(updatedProduct.customCategories) ||
        originalProduct.setMinStock !== updatedProduct.setMinStock ||
        originalProduct.minStock !== updatedProduct.minStock ||
        (rubro === "indumentaria" &&
          (originalProduct.category !== updatedProduct.category ||
            originalProduct.color !== updatedProduct.color ||
            originalProduct.size !== updatedProduct.size ||
            originalProduct.brand !== updatedProduct.brand)) ||
        originalProduct.season !== updatedProduct.season
      );
    },
    [rubro]
  );

  // Funciones principales
  const handleReturnProduct = useCallback(async () => {
    if (!selectedReturnProduct) {
      showNotification("Por favor seleccione un producto", "error");
      return;
    }

    try {
      const currentStock = selectedReturnProduct.stock;

      if (returnQuantity <= 0) {
        showNotification("La cantidad debe ser mayor a 0", "error");
        return;
      }

      const baseQuantity = convertToBaseUnit(returnQuantity, returnUnit);
      const currentStockInBase = convertToBaseUnit(
        currentStock,
        selectedReturnProduct.unit
      );

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        showNotification("No hay caja abierta para hoy", "error");
        return;
      }

      const amountToSubtract = selectedReturnProduct.price * returnQuantity;
      const profitToSubtract =
        (selectedReturnProduct.price - selectedReturnProduct.costPrice) *
        returnQuantity;

      const returnMovement: DailyCashMovement = {
        id: Date.now(),
        amount: amountToSubtract,
        description: `Devolución: ${getDisplayProductName(
          selectedReturnProduct,
          rubro,
          false
        )} - ${returnReason.trim() || "Sin motivo"}`,
        type: "EGRESO",
        paymentMethod: "EFECTIVO",
        date: new Date().toISOString(),
        productId: selectedReturnProduct.id,
        productName: getDisplayProductName(selectedReturnProduct, rubro, false),
        costPrice: selectedReturnProduct.costPrice,
        sellPrice: selectedReturnProduct.price,
        quantity: returnQuantity,
        profit: -profitToSubtract,
        rubro: selectedReturnProduct.rubro || rubro,
        unit: selectedReturnProduct.unit,
      };

      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, returnMovement],
        totalExpense: (dailyCash.totalExpense || 0) + amountToSubtract,
        totalProfit: (dailyCash.totalProfit || 0) - profitToSubtract,
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      const updatedStock = convertFromBaseUnit(
        currentStockInBase + baseQuantity,
        selectedReturnProduct.unit
      );
      await updateProduct(selectedReturnProduct.id, {
        stock: parseFloat(updatedStock.toFixed(3)),
      });

      const newReturn: ProductReturn = {
        id: Date.now(),
        productId: selectedReturnProduct.id,
        productName: getDisplayProductName(selectedReturnProduct, rubro, false),
        reason: returnReason.trim() || "Sin motivo",
        date: new Date().toISOString(),
        stockAdded: parseFloat(
          convertFromBaseUnit(baseQuantity, selectedReturnProduct.unit).toFixed(
            3
          )
        ),
        amount: amountToSubtract,
        profit: profitToSubtract,
        rubro: selectedReturnProduct.rubro || rubro,
      };

      await db.returns.add(newReturn);
      setReturns((prev) => [...prev, newReturn]);

      showNotification(
        `Producto ${getDisplayProductName(
          selectedReturnProduct
        )} devuelto correctamente. Stock actualizado: ${updatedStock} ${
          selectedReturnProduct.unit
        }. Monto restado: ${formatCurrency(amountToSubtract)}`,
        "success"
      );

      resetReturnData();
      setIsReturnModalOpen(false);
    } catch (error) {
      console.error("Error al devolver producto:", error);
      showNotification("Error al devolver el producto", "error");
    }
  }, [
    selectedReturnProduct,
    returnQuantity,
    returnReason,
    returnUnit,
    rubro,
    updateProduct,
    showNotification,
  ]);

  const resetReturnData = useCallback(() => {
    setSelectedReturnProduct(null);
    setReturnReason("");
    setReturnQuantity(0);
    setReturnUnit("");
  }, []);

  const handleSort = useCallback(
    (sort: { field: keyof Product; direction: "asc" | "desc" }) => {
      setSortConfig(sort);
    },
    []
  );

  const handleSizeInputBlur = useCallback(() => {
    if (newSize.trim() && newSize !== newProduct.size) {
      setNewProduct({
        ...newProduct,
        size: newSize.trim(),
      });

      if (
        !clothingSizes.some(
          (size) => size.value.toLowerCase() === newSize.toLowerCase().trim()
        )
      ) {
        const newSizeOption = {
          value: newSize.trim(),
          label: newSize.trim(),
        };
        setClothingSizes((prev) =>
          [...prev, newSizeOption].sort((a, b) =>
            a.label.localeCompare(b.label)
          )
        );
      }
    }
  }, [newSize, newProduct, clothingSizes]);

  const handleDeleteCategoryClick = useCallback(
    async (category: { name: string; rubro: Rubro }) => {
      if (!category.name.trim()) return;

      setCategoryToDelete(category);
      setIsCategoryDeleteModalOpen(true);
    },
    []
  );

  const handleConfirmDeleteSize = useCallback(async () => {
    if (!sizeToDelete) return;

    try {
      const productsWithSize = await db.products
        .where("size")
        .equals(sizeToDelete)
        .and((product) => product.rubro === "indumentaria")
        .count();

      if (productsWithSize > 0) {
        showNotification(
          `No se puede eliminar el talle porque ${productsWithSize} producto(s) lo están usando`,
          "error"
        );
        return;
      }

      setClothingSizes((prev) =>
        prev.filter((size) => size.value !== sizeToDelete)
      );

      showNotification("Talle eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar talle:", error);
      showNotification("Error al eliminar el talle", "error");
    } finally {
      setIsSizeDeleteModalOpen(false);
      setSizeToDelete(null);
    }
  }, [sizeToDelete, showNotification]);

  const handleConfirmDeleteCategory = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      if (!categoryToDelete) return;

      try {
        await db.customCategories
          .where("name")
          .equalsIgnoreCase(categoryToDelete.name)
          .and((cat) => cat.rubro === categoryToDelete.rubro)
          .delete();

        const allProducts = await db.products.toArray();

        const updatePromises = allProducts.map(async (product: Product) => {
          const updatedCategories = (product.customCategories || []).filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          );

          if (
            updatedCategories.length !== (product.customCategories?.length || 0)
          ) {
            await db.products.update(product.id, {
              customCategories: updatedCategories,
            });
            return {
              ...product,
              customCategories: updatedCategories,
            };
          }
          return product;
        });

        const updatedProducts = await Promise.all(updatePromises);

        setProducts(updatedProducts);

        setGlobalCustomCategories((prev) =>
          prev.filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          )
        );

        setNewProduct((prev) => ({
          ...prev,
          customCategories: (prev.customCategories || []).filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          ),
        }));

        showNotification(
          `Categoría "${categoryToDelete.name}" eliminada correctamente`,
          "success"
        );
      } catch (error) {
        console.error("Error al eliminar categoría:", error);
        showNotification("Error al eliminar categoría", "error");
      } finally {
        setIsCategoryDeleteModalOpen(false);
        setCategoryToDelete(null);
      }
    },
    [categoryToDelete, showNotification, setProducts]
  );

  const renderCategoryOption = useCallback(
    (
      props: React.HTMLAttributes<HTMLLIElement>,
      option: { value: { name: string; rubro: Rubro }; label: string }
    ) => {
      return (
        <Box component="li" {...props}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div>
              <span>{option.label}</span>
            </div>
            <IconButton
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteCategoryClick(option.value);
              }}
              size="small"
              sx={{
                borderRadius: "4px",
                color: "error.main",
                "&:hover": {
                  color: "error.dark",
                },
                marginLeft: "8px",
                padding: "4px",
              }}
              title="Eliminar categoría"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      );
    },
    [handleDeleteCategoryClick]
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query.toLowerCase());
  }, []);

  const generateAutoBarcode = useCallback(() => {
    const ean13Code = generateValidEAN13();
    setNewProduct({
      ...newProduct,
      barcode: ean13Code,
    });
  }, [generateValidEAN13, newProduct]);

  const handleGenerateBarcode = useCallback((product: Product) => {
    setSelectedProductForBarcode(product);
    setIsBarcodeModalOpen(true);
  }, []);

  const handleOpenPriceModal = useCallback(() => {
    setIsPriceModalOpen(true);
    setScannedProduct(null);
    setBarcodeInput("");
    setTimeout(() => {
      const input = document.getElementById("price-check-barcode");
      if (input) input.focus();
    }, 100);
  }, []);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const product = products.find((p) => p.barcode === code);
      if (product) {
        setScannedProduct(product);
        const productName =
          rubro === "indumentaria"
            ? `${product.name}${
                product.color ? ` - ${product.color.toUpperCase()}` : ""
              }${product.size ? ` (${product.size})` : ""}`
            : product.name;
        showNotification(
          `Precio de ${productName}: ${formatCurrency(product.price)}`,
          "success"
        );
      } else {
        showNotification("Producto no encontrado", "error");
      }
      setBarcodeInput("");
    },
    [products, rubro, showNotification]
  );

  const handleAddProduct = useCallback(async () => {
    const categories = await loadCustomCategories();
    setGlobalCustomCategories(categories);
    setIsOpenModal(true);
  }, [loadCustomCategories]);

  const handleAddCategory = useCallback(async () => {
    if (!newProduct.customCategory?.trim()) return;

    const trimmedCategory = newProduct.customCategory.trim();
    const lowerName = trimmedCategory.toLowerCase();
    const alreadyExists = globalCustomCategories.some(
      (cat) => cat.name.toLowerCase() === lowerName && cat.rubro === rubro
    );

    if (alreadyExists) {
      showNotification("La categoría ya existe para este rubro", "error");
      return;
    }

    const newCategory = {
      name: trimmedCategory,
      rubro: rubro,
    };

    try {
      await db.customCategories.add(newCategory);

      setGlobalCustomCategories((prev) => [...prev, newCategory]);

      setNewProduct((prev) => ({
        ...prev,
        customCategories: [newCategory],
        customCategory: "",
      }));

      showNotification("Categoría agregada correctamente", "success");
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      showNotification("Error al guardar la categoría", "error");
    }
  }, [
    newProduct.customCategory,
    globalCustomCategories,
    rubro,
    showNotification,
  ]);

  const handleConfirmAddProduct = useCallback(async () => {
    const authData = await db.auth.get(1);
    if (authData?.userId === 1) {
      const isLimitReached = await checkProductLimit(rubro);
      if (isLimitReached) {
        showNotification(
          `Límite alcanzado: máximo ${PRODUCT_CONFIG.MAX_PRODUCTS_PER_CATEGORY} productos por rubro para el administrador`,
          "error"
        );
        return;
      }
    }

    const validationErrors = validateProduct(newProduct);
    if (validationErrors.length > 0) {
      showNotification(validationErrors.join(", "), "error");
      return;
    }

    if (!newProduct.customCategories?.length && !newProduct.customCategory) {
      showNotification("Por favor, complete todos los campos", "error");
      return;
    }

    const productToSave = {
      ...newProduct,
      rubro: rubro,
      stock: Number(newProduct.stock),
      costPrice: Number(newProduct.costPrice),
      price: Number(newProduct.price),
      hasIvaIncluded:
        newProduct.hasIvaIncluded !== undefined
          ? newProduct.hasIvaIncluded
          : true,
      quantity: Number(newProduct.quantity),
      ...(newProduct.customCategories?.length
        ? {
            customCategories: newProduct.customCategories.map((cat) => ({
              name: cat.name.trim(),
              rubro: cat.rubro || rubro,
            })),
            category: "",
          }
        : newProduct.category
        ? {
            customCategories: [],
            category: newProduct.category,
          }
        : {
            customCategories: [],
            category: "",
          }),
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productToSave);
      } else {
        await addProduct(productToSave);
      }

      const updatedCategories = await loadCustomCategories();
      setGlobalCustomCategories(updatedCategories);

      showNotification(
        `Producto ${productToSave.name} ${
          editingProduct ? "actualizado" : "agregado"
        } correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      showNotification("Error al guardar el producto", "error");
    } finally {
      handleCloseModal();
    }
  }, [
    newProduct,
    rubro,
    editingProduct,
    validateProduct,
    checkProductLimit,
    updateProduct,
    addProduct,
    loadCustomCategories,
    showNotification,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id);
        showNotification(
          `Producto ${productToDelete.name} eliminado`,
          "success"
        );
        setProductToDelete(null);
      } catch {
        showNotification("Error al eliminar el producto", "error");
      }
    }
    setIsConfirmModalOpen(false);
  }, [productToDelete, deleteProduct, showNotification]);

  const handleCloseModal = useCallback(() => {
    setIsOpenModal(false);
    setNewBrand("");
    setNewSize("");
    setNewColor("");
    setNewProduct({
      id: Date.now(),
      name: "",
      stock: 0,
      costPrice: 0,
      price: 0,
      expiration: "",
      quantity: 0,
      unit: PRODUCT_CONFIG.DEFAULT_UNIT,
      barcode: "",
      category: "",
      brand: "",
      color: "",
      size: "",
      rubro: rubro,
      lot: "",
      location: "",
      customCategory: "",
      customCategories: [],
    });
    setEditingProduct(null);
  }, [rubro]);

  const handleEditProduct = useCallback(
    async (product: Product) => {
      const categories = await loadCustomCategories();
      setGlobalCustomCategories(categories);

      setEditingProduct(product);
      setNewBrand(product.brand || "");
      setNewColor(product.color || "");

      let categoriesToSet = (product.customCategories || []).map((cat) => ({
        name: cat.name,
        rubro: cat.rubro || product.rubro || rubro || "comercio",
      }));

      if (categoriesToSet.length === 0 && product.category) {
        categoriesToSet = [
          {
            name: product.category,
            rubro: product.rubro || rubro || "comercio",
          },
        ];
      }

      const hasIvaIncluded =
        product.hasIvaIncluded !== undefined ? product.hasIvaIncluded : true;

      setNewProduct({
        ...product,
        hasIvaIncluded,
        customCategories: categoriesToSet,
        category: "",
        customCategory: "",
        size: product.size || "",
        color: product.color || "",
        setMinStock: product.setMinStock || false,
        minStock: product.minStock || 0,
      });

      setIsOpenModal(true);
    },
    [rubro, loadCustomCategories]
  );

  const handleDeleteProduct = useCallback((product: Product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  }, []);

  // Efectos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        setIsSelectionModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setIsSaveDisabled(!hasChanges(editingProduct, newProduct));
    } else {
      setIsSaveDisabled(
        !newProduct.name ||
          !newProduct.stock ||
          !newProduct.costPrice ||
          !newProduct.price ||
          !newProduct.unit
      );
    }
  }, [newProduct, editingProduct, hasChanges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchProducts();
        const storedReturns = await db.returns.toArray();
        setReturns(
          storedReturns.map((r) => ({
            ...r,
            id: Number(r.id),
          }))
        );
        await loadCustomCategories();
      } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("Error al cargar los datos", "error");
      }
    };

    fetchData();
  }, [fetchProducts, loadCustomCategories, showNotification]);

  useEffect(() => {
    const fetchCategories = async () => {
      const categories = await loadCustomCategories();
      setGlobalCustomCategories(categories);
    };
    if (isOpenModal) {
      fetchCategories();
    }
  }, [rubro, isOpenModal, loadCustomCategories]);

  useEffect(() => {
    const loadSuppliers = async () => {
      const supplierMap: Record<number, string> = {};

      for (const product of products) {
        const supplierIds = await db.supplierProducts
          .where("productId")
          .equals(product.id)
          .primaryKeys();

        if (supplierIds.length > 0) {
          const supplier = await db.suppliers.get(supplierIds[0][0]);
          if (supplier) {
            supplierMap[product.id] = supplier.companyName;
          }
        }
      }

      setProductSuppliers(supplierMap);
    };

    loadSuppliers();
  }, [products]);

  useEffect(() => {
    const initialize = async () => {
      await loadCustomCategories();
      if (!editingProduct) {
        setNewProduct((prev) => ({
          ...prev,
          rubro: rubro,
          customCategories: (prev.customCategories || [])
            .filter(
              (cat) => cat.rubro === rubro || cat.rubro === "Todos los rubros"
            )
            .map((cat) => ({
              name: cat.name,
              rubro: cat.rubro || rubro,
            })),
        }));
      }
    };

    initialize();
  }, [rubro, isOpenModal, loadCustomCategories, editingProduct]);

  useEffect(() => {
    if (rubro === "indumentaria") {
      loadClothingSizes();
    } else {
      setClothingSizes([]);
    }
  }, [rubro, products, loadClothingSizes]);

  // Cálculos memoizados
  const sortedProducts = useMemo(() => {
    let filtered = [...products];

    if (rubro !== "Todos los rubros") {
      filtered = filtered.filter((product) => product.rubro === rubro);
    }

    if (searchQuery) {
      filtered = filtered.filter((product) => {
        const productName = getDisplayProductName(
          product,
          rubro,
          false
        ).toLowerCase();
        return productName.includes(searchQuery.toLowerCase());
      });
    }

    if (filters.length > 0) {
      filtered = filtered.filter((product) => {
        return filters.every((filter) => {
          const fieldValue =
            filter.field === "customCategories"
              ? product.customCategories?.[0]?.name
              : product[filter.field as keyof Product];

          if (fieldValue === undefined || fieldValue === null) return false;
          return (
            String(fieldValue).toLowerCase() ===
            String(filter.value).toLowerCase()
          );
        });
      });
    }

    filtered.sort((a, b) => {
      const today = startOfDay(new Date());

      const getExpirationStatus = (product: Product) => {
        if (!product.expiration) return 3;
        const expDate = startOfDay(parseISO(product.expiration));
        const diffDays = differenceInDays(expDate, today);

        if (diffDays < 0) return 0;
        if (diffDays === 0) return 1;
        if (diffDays <= 7) return 2;
        return 3;
      };

      const statusA = getExpirationStatus(a);
      const statusB = getExpirationStatus(b);

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      let compareResult = 0;
      const field = sortConfig.field;
      const direction = sortConfig.direction;

      switch (field) {
        case "name":
          compareResult = a.name.localeCompare(b.name);
          break;
        case "price":
          compareResult = Number(a.price) - Number(b.price);
          break;
        case "stock":
          compareResult = a.stock - b.stock;
          break;
        case "expiration":
          if (!a.expiration && !b.expiration) compareResult = 0;
          else if (!a.expiration) compareResult = 1;
          else if (!b.expiration) compareResult = -1;
          else {
            const dateA = parseISO(a.expiration);
            const dateB = parseISO(b.expiration);
            compareResult = dateA.getTime() - dateB.getTime();
          }
          break;
        default:
          const valueA = String(a[field] || "");
          const valueB = String(b[field] || "");
          compareResult = valueA.localeCompare(valueB);
      }

      return direction === "asc" ? compareResult : -compareResult;
    });

    return filtered;
  }, [products, rubro, searchQuery, filters, sortConfig]);

  // Paginación
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const selectedUnit =
    unitOptions.find((opt) => opt.value === newProduct.unit) ?? null;

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 4,
          py: 2,
          height: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Productos
        </Typography>

        {/* Header con búsqueda y acciones */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <SearchBar onSearch={handleSearch} />
            <AdvancedFilterPanel
              data={products}
              onApplyFilters={setFilters}
              onApplySort={handleSort}
              rubro={rubro}
            />
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 1,
              gap: 2,
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              onClick={handleAddProduct}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Añadir Producto [F2]
            </Button>
            <Button
              variant="contained"
              onClick={() => setIsSelectionModalOpen(true)}
              sx={{
                bgcolor: "secondary.main",
                "&:hover": { bgcolor: "secondary.dark" },
              }}
              startIcon={<Inventory2 fontSize="small" />}
            >
              Devoluciones [F3]
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenPriceModal}
              sx={{
                bgcolor: "info.main",
                "&:hover": { bgcolor: "info.dark" },
              }}
            >
              Ver Precio [F4]
            </Button>
          </Box>
        </Box>

        {/* Tabla de productos */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "calc(100vh - 250px)", flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      Producto
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Stock
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Categoría
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ubicación
                    </TableCell>

                    {rubro === "indumentaria" && (
                      <>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Talle
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Color
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Marca
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Temporada
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Precio costo
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Precio venta
                    </TableCell>
                    {rubro !== "indumentaria" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Vencimiento
                      </TableCell>
                    )}
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Proveedor
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={rubro === "indumentaria" ? 12 : 10}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            py: 4,
                          }}
                        >
                          <Box
                            sx={{
                              animation: "spin 1s linear infinite",
                              width: "32px",
                              height: "32px",
                              border: "2px solid",
                              borderColor: "primary.main transparent",
                              borderRadius: "50%",
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : currentProducts.length > 0 ? (
                    currentProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        rubro={rubro}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onGenerateBarcode={handleGenerateBarcode}
                        supplierName={productSuppliers[product.id]}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro === "indumentaria" ? 12 : 10}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <Inventory2
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>Todavía no hay productos.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {sortedProducts.length > 0 && (
            <Pagination
              text="Productos por página"
              text2="Total de productos"
              totalItems={sortedProducts.length}
            />
          )}
        </Box>

        {/* Modales */}
        <Modal
          isOpen={isSizeDeleteModalOpen}
          onClose={() => setIsSizeDeleteModalOpen(false)}
          title="Eliminar Talle"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmDeleteSize}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Confirmar
              </Button>
              <Button
                variant="text"
                onClick={() => setIsSizeDeleteModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
            </Box>
          }
        >
          <div className="space-y-4">
            <p>
              ¿Está seguro que desea eliminar el talle{" "}
              <span className="font-bold">{sizeToDelete}</span>?
            </p>
            <div className="bg-yellow-50 dark:bg-gray_b p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <Warning className="inline mr-2" fontSize="small" />
                Solo se pueden eliminar talles que no estén siendo utilizados
                por ningún producto.
              </p>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          title="Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => setIsSelectionModalOpen(false)}
              sx={{
                color: "text.secondary",
                borderColor: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.primary",
                },
              }}
            >
              Cancelar
            </Button>
          }
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setIsReturnModalOpen(true);
              }}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Devolver Producto
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setShowReturnsHistory(true);
              }}
              sx={{
                bgcolor: "secondary.main",
                "&:hover": { bgcolor: "secondary.dark" },
              }}
            >
              Ver Historial
            </Button>
          </Box>
        </Modal>

        <Modal
          isOpen={showReturnsHistory}
          onClose={() => setShowReturnsHistory(false)}
          title="Historial de Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => {
                setShowReturnsHistory(false);
                setIsSelectionModalOpen(true);
              }}
              sx={{
                color: "text.secondary",
                borderColor: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.primary",
                },
              }}
            >
              Volver
            </Button>
          }
        >
          <div className="max-h-[55vh] overflow-y-auto">
            {returns.length > 0 ? (
              <table className="w-full border-collapse">
                <thead className="bg-blue_m text-white">
                  <tr>
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-left">Motivo</th>
                    <th className="p-2">Cantidad</th>
                    <th className="p-2">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray_xl">
                  {returns
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((ret, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                      >
                        <td className="p-2">{ret.productName}</td>
                        <td className="p-2">{ret.reason}</td>
                        <td className="p-2 text-center">{ret.stockAdded}</td>
                        <td className="p-2 text-center">
                          {format(parseISO(ret.date), "dd/MM/yyyy HH:mm", {
                            locale: es,
                          })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-4">
                <Inventory2
                  sx={{ fontSize: 48, color: "gray_m", marginBottom: 2 }}
                />
                <p>No hay devoluciones registradas</p>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            resetReturnData();
          }}
          title="Devolver Producto [F3]"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleReturnProduct}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Confirmar Devolución
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  resetReturnData();
                  setIsSelectionModalOpen(true);
                }}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Volver
              </Button>
            </Box>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Seleccionar Producto
              </label>
              <Autocomplete
                options={sortedProducts.map((product) => ({
                  value: product,
                  label: getDisplayProductName(product, rubro, false),
                }))}
                value={
                  selectedReturnProduct
                    ? {
                        value: selectedReturnProduct,
                        label: getDisplayProductName(
                          selectedReturnProduct,
                          rubro,
                          false
                        ),
                      }
                    : null
                }
                onChange={(event, selectedOption) => {
                  setSelectedReturnProduct(selectedOption?.value || null);
                }}
                renderInput={(params) => (
                  <Input
                    {...params}
                    placeholder="Buscar producto..."
                    size="small"
                  />
                )}
                isOptionEqualToValue={(option, value) =>
                  option.value.id === value.value.id
                }
              />
            </div>

            {selectedReturnProduct && (
              <div className="mt-2 p-3 bg-blue_xl dark:bg-gray_m rounded-lg">
                <p className="font-semibold">Producto seleccionado:</p>
                <p>
                  {getDisplayProductName(selectedReturnProduct, rubro, false)}
                </p>
                <p>
                  Stock actual: {selectedReturnProduct.stock}{" "}
                  {selectedReturnProduct.unit}
                </p>
              </div>
            )}

            {selectedReturnProduct && (
              <div className="flex flex-col gap-2">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Cantidad a devolver
                </label>
                <div className="flex max-w-75">
                  <Input
                    type="number"
                    value={returnQuantity || ""}
                    onChange={(value) => {
                      const numValue = value === "" ? 1 : Number(value);
                      setReturnQuantity(numValue);
                    }}
                    size="small"
                    customSx={{ width: "160px" }}
                    step={
                      selectedReturnProduct?.unit === "Kg" ||
                      selectedReturnProduct?.unit === "L"
                        ? "0.001"
                        : "1"
                    }
                  />
                  <Select
                    label=""
                    value={returnUnit || selectedReturnProduct?.unit || ""}
                    options={getCompatibleUnits(
                      selectedReturnProduct?.unit || "Unid."
                    ).map((unit) => ({
                      value: unit.value,
                      label: unit.label,
                    }))}
                    onChange={(value) => setReturnUnit(value)}
                    size="small"
                    disabled
                    sx={{ width: "240px", marginLeft: "8px" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Motivo de la devolución
              </label>
              <Input
                type="text"
                placeholder="Ej: Producto defectuoso, cambio de talla, etc."
                value={returnReason}
                onChange={(value) => setReturnReason(value.toString())}
                fullWidth
                size="small"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isOpenModal}
          onConfirm={handleConfirmAddProduct}
          onClose={handleCloseModal}
          title={editingProduct ? "Editar Producto" : "Añadir Producto"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleConfirmAddProduct}
                disabled={isSaveDisabled}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                  "&:disabled": { bgcolor: "action.disabled" },
                }}
              >
                {editingProduct ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="text"
                onClick={handleCloseModal}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
            </Box>
          }
        >
          <form
            className="flex flex-col gap-4 overflow-y-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Sección 1: Información Básica */}
            <div className=" space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue_m rounded-full"></div>
                <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
                  Información Básica
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Nombre del Producto */}
                <div className="space-y-2 lg:col-span-2">
                  <Input
                    label="Nombre del Producto"
                    value={newProduct.name}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, name: value.toString() })
                    }
                    placeholder="Ingrese el nombre del producto"
                    required
                  />
                </div>

                {/* Código de Barras */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                    Código de Barras
                  </label>
                  <BarcodeScanner
                    value={newProduct.barcode || ""}
                    onChange={(value) => {
                      setNewProduct({ ...newProduct, barcode: value });
                    }}
                    onScanComplete={(code) => {
                      const existingProduct = products.find(
                        (p) => p.barcode === code
                      );
                      if (existingProduct) {
                        setNewProduct({
                          ...existingProduct,
                          id: editingProduct ? existingProduct.id : Date.now(),
                          barcode: existingProduct.barcode,
                        });
                        setEditingProduct(existingProduct);
                        showNotification("Producto encontrado", "success");
                      } else if (editingProduct) {
                        setNewProduct({
                          ...newProduct,
                          barcode: code,
                        });
                      }
                    }}
                    placeholder="Escanear código"
                    onButtonClick={generateAutoBarcode}
                    buttonTitle="Generar código de barras"
                  />
                </div>

                {/* Lote */}
                <div className="flex items-end space-y-2">
                  <Input
                    label="Lote/Número de Serie"
                    value={newProduct.lot || ""}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, lot: value.toString() })
                    }
                    placeholder="Número de lote"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Categorización */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue_m rounded-full"></div>
                <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
                  Categorización
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Categoría */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={[
                      ...globalCustomCategories
                        .filter(
                          (cat) =>
                            cat.rubro === rubro ||
                            cat.rubro === "Todos los rubros"
                        )
                        .map((cat) => ({
                          value: cat,
                          label: cat.name,
                        })),
                      ...(editingProduct?.category &&
                      !globalCustomCategories.some(
                        (c) =>
                          c.name.toLowerCase() ===
                            editingProduct.category?.toLowerCase() &&
                          c.rubro === (editingProduct.rubro || rubro)
                      )
                        ? [
                            {
                              value: {
                                name: editingProduct.category,
                                rubro: editingProduct.rubro || rubro,
                              },
                              label: `${editingProduct.category}`,
                            },
                          ]
                        : []),
                    ]}
                    value={
                      newProduct.customCategories?.[0]
                        ? {
                            value: newProduct.customCategories[0],
                            label: newProduct.customCategories[0].name,
                          }
                        : editingProduct?.category
                        ? {
                            value: {
                              name: editingProduct.category,
                              rubro: editingProduct.rubro || rubro,
                            },
                            label: `${editingProduct.category}`,
                          }
                        : null
                    }
                    onChange={(event, selectedOption) => {
                      setNewProduct((prev) => ({
                        ...prev,
                        customCategories: selectedOption
                          ? [selectedOption.value]
                          : [],
                        category: "",
                      }));
                    }}
                    renderInput={(params) => (
                      <Input
                        {...params}
                        placeholder="Buscar o seleccionar categoría"
                        size="small"
                      />
                    )}
                    renderOption={renderCategoryOption}
                  />
                </div>

                {/* Nueva Categoría */}
                {editingProduct ? (
                  <div className=" flex items-end space-y-2">
                    <div className="w-full bg-white dark:bg-gray_b p-2.5 rounded-lg border border-blue_l">
                      <p className="text-sm text-blue_b dark:text-blue-200">
                        <Info className="inline mr-2" fontSize="small" />
                        Para cambiar la categoría, seleccione una existente de
                        la lista.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end space-y-2">
                    <Input
                      label="Crear Nueva Categoría"
                      value={newProduct.customCategory || ""}
                      onChange={(value) =>
                        setNewProduct({
                          ...newProduct,
                          customCategory: value.toString(),
                        })
                      }
                      placeholder="Nombre de nueva categoría"
                      buttonIcon={<Add fontSize="small" />}
                      onButtonClick={handleAddCategory}
                      buttonTitle="Crear categoría"
                      buttonDisabled={!newProduct.customCategory?.trim()}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sección 3: Precios y Stock */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue_m rounded-full"></div>
                <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
                  Precios y Stock
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Precio de Costo */}
                <div className="space-y-2">
                  <InputCash
                    label="Precio de Costo"
                    value={newProduct.costPrice}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, costPrice: value })
                    }
                  />
                </div>

                {/* Precio de Venta */}
                <div className="space-y-2">
                  <InputCash
                    label="Precio de Venta"
                    value={newProduct.price}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, price: value })
                    }
                  />
                </div>

                {/* Stock Actual */}
                <div className="flex items-end space-y-2">
                  <Input
                    label="Stock Actual"
                    value={newProduct.stock !== 0 ? newProduct.stock : ""}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, stock: Number(value) })
                    }
                    type="number"
                  />
                </div>
              </div>

              {/* Configuración de IVA y Stock Mínimo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Configuración de IVA */}
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray_b p-4 rounded-lg border border-gray-200">
                    <Checkbox
                      label="Incluir IVA 21%"
                      checked={newProduct.hasIvaIncluded || false}
                      onChange={handleIvaCheckboxChange}
                      helperText={
                        newProduct.hasIvaIncluded
                          ? "Precios incluyen IVA"
                          : "Precios sin IVA"
                      }
                    />
                  </div>
                </div>

                {/* Stock Mínimo */}
                <div className="space-y-2">
                  <div className="bg-gray_xxl dark:bg-gray_b p-4 rounded-lg border border-gray_xxl">
                    <div className="flex items-center justify-between">
                      <Checkbox
                        label="Establecer stock mínimo"
                        checked={newProduct.setMinStock || false}
                        onChange={(checked) => {
                          setNewProduct({
                            ...newProduct,
                            setMinStock: checked,
                            minStock: checked ? newProduct.minStock || 1 : 0,
                          });
                        }}
                      />
                    </div>
                    {newProduct.setMinStock && (
                      <div className="flex items-center gap-3">
                        <InputCash
                          label="Stock mínimo"
                          value={newProduct.minStock || 0}
                          onChange={(value) =>
                            setNewProduct({ ...newProduct, minStock: value })
                          }
                          placeholder="1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 4: Configuración Adicional */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue_m rounded-full"></div>
                <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
                  Configuración Adicional
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Unidad de Medida */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                    Unidad de Medida <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={unitOptions}
                    value={selectedUnit}
                    onChange={(event, selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        unit: selectedOption?.value as Product["unit"],
                      });
                    }}
                    renderInput={(params) => (
                      <Input
                        {...params}
                        placeholder="Seleccionar unidad"
                        size="small"
                      />
                    )}
                  />
                </div>

                {/* Ubicación */}
                <div className=" flex items-end space-y-2">
                  <Input
                    label="Ubicación en Almacén"
                    value={newProduct.location || ""}
                    onChange={(value) =>
                      setNewProduct({
                        ...newProduct,
                        location: value.toString(),
                      })
                    }
                    placeholder="Ej: Estante A-2"
                  />
                </div>

                {/* Temporada */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                    Temporada
                  </label>
                  <Autocomplete
                    options={seasonOptions}
                    value={
                      newProduct.season
                        ? seasonOptions.find(
                            (opt) => opt.value === newProduct.season
                          )
                        : null
                    }
                    onChange={(event, selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        season: selectedOption?.value || "",
                      });
                    }}
                    renderInput={(params) => (
                      <Input
                        {...params}
                        placeholder="Seleccionar temporada"
                        size="small"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Fecha de Vencimiento */}
              {rubro !== "indumentaria" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                    Fecha de Vencimiento
                  </label>
                  <CustomDatePicker
                    value={newProduct.expiration || ""}
                    onChange={(newDate) => {
                      setNewProduct({ ...newProduct, expiration: newDate });
                    }}
                    isClearable={true}
                  />
                </div>
              )}
            </div>

            {/* Sección 5: Especificaciones de Indumentaria */}
            {rubro === "indumentaria" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray_m dark:text-white">
                    Especificaciones de Indumentaria
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Talle */}
                  <div className="space-y-2">
                    <Input
                      label="Talle/Medida"
                      value={newSize}
                      onChange={(value) => {
                        setNewSize(value.toString());
                        setNewProduct({
                          ...newProduct,
                          size: value.toString(),
                        });
                      }}
                      onBlur={handleSizeInputBlur}
                      placeholder="Crear nuevo talle"
                    />
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Input
                      label="Color"
                      value={newColor}
                      onChange={(value) => {
                        setNewColor(value.toString());
                        if (value.toString()) {
                          setNewProduct({
                            ...newProduct,
                            color: value.toString(),
                          });
                        }
                      }}
                      placeholder="Crear nuevo color"
                    />
                  </div>

                  {/* Marca */}
                  <div className="space-y-2">
                    <Input
                      label="Marca"
                      value={newBrand}
                      onChange={(value) => {
                        setNewBrand(value.toString());
                        if (value.toString()) {
                          setNewProduct({
                            ...newProduct,
                            brand: value.toString(),
                          });
                        }
                      }}
                      placeholder="Crear nueva marca"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </Modal>

        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                color="error"
                onClick={(e) => {
                  e?.preventDefault();
                  handleConfirmDeleteCategory();
                }}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Confirmar
              </Button>
              <Button
                variant="text"
                onClick={(e) => {
                  e?.preventDefault();
                  setIsCategoryDeleteModalOpen(false);
                }}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
            </Box>
          }
        >
          <div className="space-y-4">
            <p>
              ¿Está seguro que desea eliminar la categoría{" "}
              <span className="font-bold">{categoryToDelete?.name}</span>?
            </p>

            {categoryToDelete && (
              <div className="bg-yellow-50 dark:bg-gray_b p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Info className="inline mr-2" fontSize="small" />
                  Esta acción afectará a todos los productos con esta categoría.
                </p>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Producto"
          bgColor="bg-white dark:bg-gray_b"
          onConfirm={handleConfirmDelete}
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmDelete}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Sí
              </Button>
              <Button
                variant="text"
                onClick={() => setIsConfirmModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                No
              </Button>
            </Box>
          }
        >
          <p>¿Desea eliminar el producto {productToDelete?.name}?</p>
        </Modal>

        <Modal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          title="Consultar Precio de Producto"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => setIsPriceModalOpen(false)}
              sx={{
                color: "text.secondary",
                borderColor: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.primary",
                },
              }}
            >
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Código de Barras
              </label>
              <BarcodeScanner
                value={barcodeInput}
                onChange={(value) => setBarcodeInput(value)}
                onScanComplete={(code) => {
                  handleBarcodeScan(code);
                }}
              />
            </div>

            {scannedProduct && (
              <div className="mt-4 p-4 bg-blue_xl dark:bg-gray_b rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Producto
                    </p>
                    <p className="text-2xl font-semibold">
                      {getDisplayProductName(scannedProduct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Precio
                    </p>
                    <p className="text-lg font-semibold text-blue_b dark:text-blue_l">
                      {formatCurrency(scannedProduct.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Stock
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        scannedProduct.stock > 0
                          ? "text-green_b dark:text-green_m"
                          : "text-red_b dark:text-red_m"
                      }`}
                    >
                      {scannedProduct.stock} {scannedProduct.unit}
                    </p>
                  </div>
                  {scannedProduct.expiration ? (
                    <div>
                      <p className="text-sm font-medium text-gray_m dark:text-gray_m">
                        Vencimiento
                      </p>
                      <p className="text-lg font-semibold">
                        {format(
                          parseISO(scannedProduct.expiration),
                          "dd/MM/yyyy",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <p className="text-md text-gray_l dark:text-gray_xl">
                        Sin fecha de vencimiento
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>

        {isBarcodeModalOpen && selectedProductForBarcode && (
          <BarcodeGenerator
            product={selectedProductForBarcode}
            onClose={() => setIsBarcodeModalOpen(false)}
            onBarcodeChange={(newBarcode) => {
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === selectedProductForBarcode.id
                    ? { ...p, barcode: newBarcode }
                    : p
                )
              );

              db.products.update(selectedProductForBarcode.id, {
                barcode: newBarcode,
              });
            }}
          />
        )}

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default ProductsPage;

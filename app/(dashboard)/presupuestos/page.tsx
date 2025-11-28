"use client";
import { useEffect, useState, SyntheticEvent } from "react";
import { db } from "@/app/database/db";
import {
  Budget,
  Product,
  ProductOption,
  SaleItem,
  Customer,
  UnitOption,
  DailyCashMovement,
  PaymentSplit,
  Sale,
} from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import Pagination from "@/app/components/Pagination";
import SearchBar from "@/app/components/SearchBar";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import { formatCurrency } from "@/app/lib/utils/currency";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BudgetPDF from "@/app/components/BudgetPDF";
import CustomerNotes from "@/app/components/CustomerNotes";
import { useBusinessData } from "@/app/context/BusinessDataContext";
import { ConvertToSaleModal } from "@/app/components/ConvertToSaleModal";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";

// Material-UI imports
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  useTheme,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  TextField,
  Checkbox,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Download,
  Note,
  ShoppingCart,
  Description,
  CheckBoxOutlineBlank,
  CheckBox,
} from "@mui/icons-material";
import Button from "@/app/components/Button";

// Definir tipos para las opciones
interface CustomerOption {
  value: string;
  label: string;
}

interface StatusOption {
  value: "pendiente" | "aprobado" | "rechazado";
  label: string;
}

const PresupuestosPage = () => {
  const { rubro } = useRubro();
  const { businessData } = useBusinessData();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState<
    Omit<Budget, "id" | "createdAt" | "updatedAt"> & {
      items: Array<SaleItem & { basePrice?: number }>;
      customerId?: string;
    }
  >({
    date: new Date().toISOString(),
    customerName: "",
    customerPhone: "",
    items: [],
    total: 0,
    deposit: "",
    remaining: 0,
    expirationDate: "",
    notes: "",
    status: "pendiente",
  });

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<Budget | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const { currentPage, itemsPerPage, setCurrentPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedCustomerForNotes, setSelectedCustomerForNotes] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const router = useRouter();
  const theme = useTheme();

  const CONVERSION_FACTORS = {
    A: { base: "A", factor: 1 },
    Bulto: { base: "Bulto", factor: 1 },
    Cajón: { base: "Cajón", factor: 1 },
    Caja: { base: "Caja", factor: 1 },
    Ciento: { base: "Unid.", factor: 100 },
    Cm: { base: "M", factor: 0.01 },
    Docena: { base: "Unid.", factor: 12 },
    Gr: { base: "Kg", factor: 0.001 },
    Kg: { base: "Kg", factor: 1 },
    L: { base: "L", factor: 1 },
    M: { base: "M", factor: 1 },
    "M²": { base: "M²", factor: 1 },
    "M³": { base: "M³", factor: 1 },
    Ml: { base: "L", factor: 0.001 },
    Mm: { base: "M", factor: 0.001 },
    Pulg: { base: "M", factor: 0.0254 },
    Ton: { base: "Kg", factor: 1000 },
    "Unid.": { base: "Unid.", factor: 1 },
    V: { base: "V", factor: 1 },
    W: { base: "W", factor: 1 },
  } as const;

  const unitOptions: UnitOption[] = [
    { value: "A", label: "Amperio", convertible: false },
    { value: "Bulto", label: "Bulto", convertible: false },
    { value: "Cajón", label: "Cajón", convertible: false },
    { value: "Caja", label: "Caja", convertible: false },
    { value: "Ciento", label: "Ciento", convertible: false },
    { value: "Cm", label: "Centímetro", convertible: true },
    { value: "Docena", label: "Docena", convertible: false },
    { value: "Gr", label: "Gramo", convertible: true },
    { value: "Kg", label: "Kilogramo", convertible: true },
    { value: "L", label: "Litro", convertible: true },
    { value: "M", label: "Metro", convertible: true },
    { value: "M²", label: "Metro cuadrado", convertible: false },
    { value: "M³", label: "Metro cúbico", convertible: false },
    { value: "Ml", label: "Mililitro", convertible: true },
    { value: "Mm", label: "Milímetro", convertible: true },
    { value: "Pulg", label: "Pulgada", convertible: true },
    { value: "Ton", label: "Tonelada", convertible: true },
    { value: "Unid.", label: "Unidad", convertible: false },
    { value: "V", label: "Voltio", convertible: false },
    { value: "W", label: "Watt", convertible: false },
  ];

  const statusOptions: StatusOption[] = [
    { value: "pendiente", label: "Pendiente" },
    { value: "aprobado", label: "Aprobado" },
    { value: "rechazado", label: "Rechazado" },
  ];

  const convertToBaseUnit = (quantity: number, fromUnit: string): number => {
    const unitInfo =
      CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
    return unitInfo ? quantity * unitInfo.factor : quantity;
  };

  const convertFromBaseUnit = (quantity: number, toUnit: string): number => {
    const unitInfo =
      CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];
    return unitInfo ? quantity / unitInfo.factor : quantity;
  };

  const convertUnit = (
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): number => {
    if (fromUnit === toUnit) return quantity;
    const baseQuantity = convertToBaseUnit(quantity, fromUnit);
    return convertFromBaseUnit(baseQuantity, toUnit);
  };

  const getCompatibleUnits = (productUnit: string): UnitOption[] => {
    if (productUnit === "Unid.") return [];

    const productUnitInfo =
      CONVERSION_FACTORS[productUnit as keyof typeof CONVERSION_FACTORS];
    if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);

    return unitOptions.filter((option) => {
      if (!option.convertible) return false;
      const optionInfo =
        CONVERSION_FACTORS[option.value as keyof typeof CONVERSION_FACTORS];
      return optionInfo?.base === productUnitInfo.base;
    });
  };

  const productOptions: ProductOption[] = products
    .filter((p) => rubro === "Todos los rubros" || p.rubro === rubro)
    .map((p) => ({
      value: p.id,
      label: `${p.name}${p.size ? ` (${p.size})` : ""}${
        p.color ? ` - ${p.color}` : ""
      }`,
      product: p,
      isDisabled: p.stock <= 0,
    })) as ProductOption[];

  // Función corregida para getOptionDisabled
  const getOptionDisabled = (option: ProductOption): boolean => {
    return option.isDisabled || false;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const storedProducts = await db.products.toArray();
      setProducts(storedProducts);
    };

    fetchProducts();
  }, [rubro]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);

      const filteredCustomers =
        rubro === "Todos los rubros"
          ? allCustomers
          : allCustomers.filter((c) => c.rubro === rubro);

      setCustomerOptions(
        filteredCustomers.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))
      );
    };

    fetchCustomers();
  }, [rubro]);

  useEffect(() => {
    const fetchBudgets = async () => {
      const allBudgets = await db.budgets.toArray();
      const searched = allBudgets.filter(
        (budget) =>
          budget.customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          budget.customerPhone
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );

      const filtered =
        rubro === "Todos los rubros"
          ? searched
          : searched.filter((budget) => budget.rubro === rubro);

      setBudgets(allBudgets);
      setFilteredBudgets(filtered);
    };

    fetchBudgets();
  }, [rubro, searchQuery]);

  const indexOfLastBudget = currentPage * itemsPerPage;
  const indexOfFirstBudget = indexOfLastBudget - itemsPerPage;
  const currentBudgets = filteredBudgets.slice(
    indexOfFirstBudget,
    indexOfLastBudget
  );

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 2500);
  };

  const calculateTotalAndRemaining = (
    items: Array<SaleItem & { basePrice?: number }>,
    deposit: string
  ) => {
    const total = items.reduce(
      (total, item) =>
        total + item.price * item.quantity * (1 - (item.discount || 0) / 100),
      0
    );
    const depositValue = deposit === "" ? 0 : parseFloat(deposit);
    const remaining = total - (isNaN(depositValue) ? 0 : depositValue);
    return { total, remaining };
  };

  const handleNewBudgetClick = async () => {
    const { needsRedirect } = await ensureCashIsOpen();

    if (needsRedirect) {
      router.push(`/caja-diaria`);
      return;
    }

    setIsModalOpen(true);
  };

  const checkStockAvailability = (
    product: Product,
    requestedQuantity: number,
    requestedUnit: string
  ): {
    available: boolean;
    availableQuantity: number;
    availableUnit: string;
  } => {
    try {
      const stockInBase = convertToBaseUnit(
        Number(product.stock),
        product.unit
      );
      const requestedInBase = convertToBaseUnit(
        requestedQuantity,
        requestedUnit
      );

      if (stockInBase >= requestedInBase) {
        return {
          available: true,
          availableQuantity: requestedQuantity,
          availableUnit: requestedUnit,
        };
      } else {
        const availableInRequestedUnit = convertFromBaseUnit(
          stockInBase,
          requestedUnit
        );
        return {
          available: false,
          availableQuantity: parseFloat(availableInRequestedUnit.toFixed(3)),
          availableUnit: requestedUnit,
        };
      }
    } catch (error) {
      console.error("Error checking stock:", error);
      return {
        available: false,
        availableQuantity: 0,
        availableUnit: requestedUnit,
      };
    }
  };

  const updateStockAfterSale = (
    productId: number,
    soldQuantity: number,
    unit: string
  ): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error(`Producto con ID ${productId} no encontrado`);

    const stockInBase = convertToBaseUnit(Number(product.stock), product.unit);
    const soldInBase = convertToBaseUnit(soldQuantity, unit);
    const newStockInBase = stockInBase - soldInBase;

    return convertFromBaseUnit(newStockInBase, product.unit);
  };

  const handleConvertToSale = async (paymentMethods: PaymentSplit[]) => {
    if (!budgetToConvert) return;

    try {
      const deposit =
        budgetToConvert.deposit && parseFloat(budgetToConvert.deposit) > 0
          ? parseFloat(budgetToConvert.deposit)
          : undefined;
      const totalToPay =
        deposit !== undefined
          ? budgetToConvert.total - deposit
          : budgetToConvert.total;
      if (
        Math.abs(
          paymentMethods.reduce((sum, m) => sum + m.amount, 0) - totalToPay
        ) > 0.01
      ) {
        showNotification(
          "La suma de los métodos de pago no coincide con el total a pagar",
          "error"
        );
        return;
      }
      for (const item of budgetToConvert.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const updatedStock = updateStockAfterSale(
            item.productId,
            item.quantity,
            item.unit
          );
          await db.products.update(item.productId, { stock: updatedStock });
        }
      }
      const totalProfit = budgetToConvert.items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return sum;
        const precioConDescuento =
          item.price * (1 - (item.discount || 0) / 100);
        const costPriceInItemUnit = product.costPrice;
        const gananciaPorUnidad = precioConDescuento - costPriceInItemUnit;

        return sum + gananciaPorUnidad * item.quantity;
      }, 0);

      const sale: Sale = {
        id: Date.now(),
        products: budgetToConvert.items.map((item) => ({
          id: item.productId || Date.now(),
          name: item.productName,
          stock: 0,
          costPrice: item.basePrice || 0,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          discount: item.discount || 0,
          rubro: item.rubro || "comercio",
          size: item.size,
          color: item.color,
          description: item.description,
        })),
        paymentMethods,
        total: budgetToConvert.total,
        date: new Date().toISOString(),
        customerName: budgetToConvert.customerName,
        customerPhone: budgetToConvert.customerPhone,
        customerId: budgetToConvert.customerId,
        deposit: deposit,
      };

      await db.sales.add(sale);

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const movements: DailyCashMovement[] = [];
        paymentMethods.forEach((method) => {
          const methodAmount = method.amount;
          const paymentRatio = methodAmount / totalToPay;

          const methodProfit =
            totalProfit * (totalToPay / budgetToConvert.total) * paymentRatio;

          movements.push({
            id: Date.now() + Math.random(),
            amount: methodAmount,
            description: `Venta - presupuesto de ${budgetToConvert.customerName}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: method.method,
            profit: methodProfit,
            profitPercentage: (methodProfit / methodAmount) * 100,
            budgetId: budgetToConvert.id,
            fromBudget: true,
            rubro: budgetToConvert.rubro || "comercio",
          });
        });

        const depositMovementIndex = dailyCash.movements.findIndex((m) =>
          m.description?.includes(
            `Presupuesto de ${budgetToConvert.customerName}`
          )
        );

        if (
          depositMovementIndex !== -1 &&
          deposit !== undefined &&
          deposit > 0
        ) {
          const depositRatio = deposit / budgetToConvert.total;
          const depositProfit = totalProfit * depositRatio;

          const updatedMovements = [...dailyCash.movements];
          updatedMovements[depositMovementIndex] = {
            ...updatedMovements[depositMovementIndex],
            profit: depositProfit,
            profitPercentage: (depositProfit / deposit) * 100,
            type: "INGRESO",
            rubro: budgetToConvert.rubro || "comercio",
            items: budgetToConvert.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              costPrice: item.basePrice || 0,
            })),
          };

          const updatedCash = {
            ...dailyCash,
            movements: [...updatedMovements, ...movements],
            totalIncome: (dailyCash.totalIncome || 0) + totalToPay,
            totalProfit: (dailyCash.totalProfit || 0) + totalProfit,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        } else {
          const updatedCash = {
            ...dailyCash,
            movements: [...dailyCash.movements, ...movements],
            totalIncome: (dailyCash.totalIncome || 0) + totalToPay,
            totalProfit: (dailyCash.totalProfit || 0) + totalProfit,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        }
      }

      await db.budgets.update(budgetToConvert.id, {
        convertedToSale: true,
        status: "cobrado",
      });

      setBudgets((prev) =>
        prev.map((b) =>
          b.id === budgetToConvert.id
            ? { ...b, convertedToSale: true, status: "cobrado" }
            : b
        )
      );
      setFilteredBudgets((prev) =>
        prev.map((b) =>
          b.id === budgetToConvert.id
            ? { ...b, convertedToSale: true, status: "cobrado" }
            : b
        )
      );

      showNotification(
        "Presupuesto cobrado como venta exitosamente",
        "success"
      );
      setIsConvertModalOpen(false);
      setBudgetToConvert(null);
    } catch (error) {
      console.error("Error al convertir presupuesto a venta:", error);
      showNotification("Error al convertir presupuesto a venta", "error");
    }
  };

  const handleProductSelect = (
    event: SyntheticEvent,
    newValue: ProductOption[]
  ) => {
    const selectedProducts = Array.from(newValue).map((option) => {
      const product = products.find((p) => p.id === option.value);
      return {
        productId: option.value,
        productName: product?.name || "",
        price: product?.price || 0,
        quantity: 1,
        unit: product?.unit || "Unid.",
        discount: 0,
        size: product?.size,
        color: product?.color,
        basePrice: product
          ? product.price / convertToBaseUnit(1, product.unit)
          : 0,
      };
    });

    const { total, remaining } = calculateTotalAndRemaining(
      selectedProducts,
      newBudget.deposit
    );

    setNewBudget((prev) => ({
      ...prev,
      items: selectedProducts,
      total,
      remaining,
    }));
  };

  const handleQuantityChange = (
    productId: number,
    quantity: number,
    unit: Product["unit"]
  ) => {
    setNewBudget((prevState) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return prevState;

      const stockCheck = checkStockAvailability(product, quantity, unit);
      if (!stockCheck.available) {
        showNotification(
          `No hay suficiente stock para ${
            product.name
          }. Stock disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
            stockCheck.availableUnit
          }`,
          "error"
        );
        return prevState;
      }

      const updatedItems = prevState.items.map((item) => {
        if (item.productId === productId) {
          const newPrice = product.price;
          return {
            ...item,
            quantity,
            unit,
            price: parseFloat(newPrice.toFixed(2)),
            basePrice: product.price,
          };
        }
        return item;
      });

      const { total, remaining } = calculateTotalAndRemaining(
        updatedItems,
        prevState.deposit
      );

      return {
        ...prevState,
        items: updatedItems,
        total,
        remaining,
      };
    });
  };

  const handleUnitChange = (
    productId: number,
    selectedOption: UnitOption | null,
    currentQuantity: number
  ) => {
    if (!selectedOption) return;

    setNewBudget((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.productId === productId) {
          const product = products.find((p) => p.id === productId);
          if (!product) return item;

          const compatibleUnits = getCompatibleUnits(product.unit);
          const isCompatible = compatibleUnits.some(
            (u) => u.value === selectedOption.value
          );

          if (!isCompatible) return item;

          const newUnit = selectedOption.value as Product["unit"];
          const basePrice =
            item.basePrice ||
            product.price / convertToBaseUnit(1, product.unit);
          const newPrice = basePrice * convertToBaseUnit(1, newUnit);
          const newQuantity = convertUnit(currentQuantity, item.unit, newUnit);

          return {
            ...item,
            unit: newUnit,
            quantity: parseFloat(newQuantity.toFixed(3)),
            price: parseFloat(newPrice.toFixed(2)),
            basePrice: basePrice,
          };
        }
        return item;
      });

      return {
        ...prev,
        items: updatedItems,
        total: calculateTotalAndRemaining(updatedItems, prev.deposit).total,
      };
    });
  };

  const handleDiscountChange = (productId: number, discount: string) => {
    let discountValue = discount === "" ? 0 : parseInt(discount) || 0;

    if (discountValue < 0) discountValue = 0;
    if (discountValue > 100) discountValue = 100;

    setNewBudget((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.productId === productId
          ? { ...item, discount: discountValue }
          : item
      );

      const { total, remaining } = calculateTotalAndRemaining(
        updatedItems,
        prev.deposit
      );

      return {
        ...prev,
        items: updatedItems,
        total,
        remaining,
      };
    });
  };

  const handleRemoveProduct = (productId: number) => {
    setNewBudget((prev) => {
      const updatedItems = prev.items.filter(
        (item) => item.productId !== productId
      );

      const { total, remaining } = calculateTotalAndRemaining(
        updatedItems,
        prev.deposit
      );

      return {
        ...prev,
        items: updatedItems,
        total,
        remaining,
      };
    });
  };

  const handleAddBudget = async () => {
    if (!newBudget.customerName.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }
    if (newBudget.items.length === 0) {
      showNotification("Debe seleccionar al menos un producto", "error");
      return;
    }

    try {
      let customerId = selectedCustomer?.value;
      if (!customerId) {
        const tempId = `temp-${Date.now()}`;
        const tempCustomer: Customer = {
          id: tempId,
          name: newBudget.customerName.trim(),
          phone: newBudget.customerPhone || "",
          notes: newBudget.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTemporary: true,
          status: "activo",
          pendingBalance: 0,
          purchaseHistory: [],
        };
        await db.customers.add(tempCustomer);
        customerId = tempId;
      }

      const budgetToAdd: Budget = {
        ...newBudget,
        id: generateBudgetId(newBudget.customerName),
        customerName: newBudget.customerName.trim(),
        customerPhone: newBudget.customerPhone || "",
        customerId,
        items: newBudget.items,
        total: calculateTotalAndRemaining(newBudget.items, newBudget.deposit)
          .total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
      };

      await db.budgets.add(budgetToAdd);

      if (newBudget.deposit && parseFloat(newBudget.deposit) > 0) {
        const today = getLocalDateString();
        const dailyCash = await db.dailyCashes.get({ date: today });

        if (dailyCash) {
          const depositAmount = parseFloat(newBudget.deposit);

          const depositMovement: DailyCashMovement = {
            id: Date.now() + Math.random(),
            amount: depositAmount,
            description: `Presupuesto de ${budgetToAdd.customerName}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: "EFECTIVO",
            items: newBudget.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              costPrice: item.basePrice || 0,
            })),
            profit: 0,
            profitPercentage: 0,
            isDeposit: true,
            budgetId: budgetToAdd.id,
            fromBudget: true,
          };

          const updatedCash = {
            ...dailyCash,
            movements: [...dailyCash.movements, depositMovement],
            totalIncome: (dailyCash.totalIncome || 0) + depositAmount,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        }
      }

      const allBudgets = await db.budgets.toArray();
      const filtered = allBudgets.filter((budget) => {
        if (rubro === "Todos los rubros") return true;
        return budget.rubro === rubro;
      });
      setBudgets(allBudgets);
      setFilteredBudgets(filtered);

      // Limpiar el estado
      setNewBudget({
        date: new Date().toISOString(),
        customerName: "",
        customerPhone: "",
        items: [],
        total: 0,
        deposit: "",
        remaining: 0,
        expirationDate: "",
        notes: "",
        status: "pendiente",
      });
      setSelectedCustomer(null);
      setIsModalOpen(false);
      showNotification("Presupuesto creado correctamente", "success");
    } catch (error) {
      console.error("Error al crear presupuesto:", error);
      showNotification("Error al crear presupuesto", "error");
    }
  };

  const generateBudgetId = (customerName: string): string => {
    const cleanName = customerName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    const timestamp = Date.now().toString().slice(-5);
    return `${cleanName}-${timestamp}`;
  };

  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await db.budgets.delete(budgetToDelete.id);
      setFilteredBudgets(
        filteredBudgets.filter((b) => b.id !== budgetToDelete.id)
      );
      setBudgets(budgets.filter((b) => b.id !== budgetToDelete.id));
      showNotification("Presupuesto eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      showNotification("Error al eliminar presupuesto", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleEditClick = (budget: Budget) => {
    setEditingBudget(budget);
    setNewBudget({
      date: budget.date,
      customerName: budget.customerName,
      customerPhone: budget.customerPhone || "",
      customerId: budget.customerId,
      items: budget.items.map((item) => ({
        ...item,
        basePrice:
          item.basePrice ||
          (products.find((p) => p.id === item.productId)?.price || 0) /
            convertToBaseUnit(1, item.unit),
      })),
      total: budget.total,
      deposit: budget.deposit,
      remaining: budget.remaining,
      expirationDate: budget.expirationDate || "",
      notes: budget.notes || "",
      status: budget.status || "pendiente",
    });

    if (budget.customerId) {
      const customer = customers.find((c) => c.id === budget.customerId);
      if (customer) {
        setSelectedCustomer({
          value: customer.id,
          label: customer.name,
        });
      }
    } else {
      setSelectedCustomer(null);
    }

    setIsModalOpen(true);
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget || !newBudget.customerName.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const { total, remaining } = calculateTotalAndRemaining(
        newBudget.items,
        newBudget.deposit
      );

      const updatedBudget = {
        ...editingBudget,
        customerName: newBudget.customerName.trim(),
        customerPhone: newBudget.customerPhone,
        customerId: selectedCustomer?.value || "",
        items: newBudget.items,
        total,
        deposit: newBudget.deposit,
        remaining,
        expirationDate: newBudget.expirationDate,
        notes: newBudget.notes,
        status: newBudget.status,
        updatedAt: new Date().toISOString(),
      };

      await db.budgets.update(editingBudget.id, updatedBudget);

      setBudgets(
        budgets.map((b) => (b.id === editingBudget.id ? updatedBudget : b))
      );

      setFilteredBudgets(
        filteredBudgets.map((b) =>
          b.id === editingBudget.id ? updatedBudget : b
        )
      );

      setNewBudget({
        date: "",
        customerName: "",
        customerPhone: "",
        items: [],
        total: 0,
        deposit: "",
        remaining: 0,
        expirationDate: "",
        notes: "",
        status: "pendiente",
      });
      setSelectedCustomer(null);
      setEditingBudget(null);
      setIsModalOpen(false);
      showNotification("Presupuesto actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar presupuesto:", error);
      showNotification("Error al actualizar presupuesto", "error");
    }
  };

  const handleDownloadPDF = (budget: Budget) => {
    return (
      <PDFDownloadLink
        document={
          <BudgetPDF
            budget={{
              ...budget,
              deposit: budget.deposit || "0",
              remaining: budget.remaining || budget.total,
            }}
            businessData={businessData}
          />
        }
        fileName={`Presupuesto de ${budget.customerName} - ${new Date(
          budget.createdAt
        ).toLocaleDateString("es-ES")}.pdf`}
      >
        {({ loading }) => (
          <IconButton
            size="small"
            disabled={loading}
            title="Descargar presupuesto"
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
              },
            }}
          >
            <Download fontSize="small" />
          </IconButton>
        )}
      </PDFDownloadLink>
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleShowNotes = (budget: Budget) => {
    setSelectedCustomerForNotes({
      id: budget.customerId || null,
      name: budget.customerName,
    });
    setNotesModalOpen(true);
  };

  const handleCustomerSelect = (
    event: SyntheticEvent,
    selectedOption: CustomerOption | null
  ) => {
    setSelectedCustomer(selectedOption);
    if (selectedOption) {
      const customer = customers.find((c) => c.id === selectedOption.value);
      if (customer) {
        setNewBudget((prev) => ({
          ...prev,
          customerName: customer.name,
          customerPhone: customer.phone || "",
        }));
      }
    } else {
      setNewBudget((prev) => ({
        ...prev,
        customerName: "",
        customerPhone: "",
      }));
    }
  };

  // Iconos para el Autocomplete de productos múltiples
  const icon = <CheckBoxOutlineBlank fontSize="small" />;
  const checkedIcon = <CheckBox fontSize="small" />;

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 5,
          py: 2,
          color: "text.secondary",
          height: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
          Presupuestos
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ width: "100%", maxWidth: "400px" }}>
            <SearchBar onSearch={handleSearch} />
          </Box>
          {rubro !== "Todos los rubros" && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleNewBudgetClick}
              sx={{
                backgroundColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              Nuevo Presupuesto
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: "calc(100vh - 250px)",
                flex: 1,
              }}
            >
              <Table sx={{ minWidth: 650 }} size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    }}
                  >
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Cliente
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Teléfono
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Total
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha Presupuesto
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha Expiración
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Estado
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          textAlign: "center",
                          width: 160,
                        }}
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentBudgets.length > 0 ? (
                    currentBudgets.map((budget) => (
                      <TableRow
                        key={budget.id}
                        sx={{
                          "&:hover": {
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "primary.light"
                                : "grey.100",
                          },
                          transition: "all 0.3s",
                        }}
                      >
                        <TableCell sx={{ fontWeight: "medium" }}>
                          {budget.customerName}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.customerPhone || "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.status === "cobrado" ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: "line-through",
                                  color: "text.disabled",
                                }}
                              >
                                {formatCurrency(
                                  budget.total -
                                    (budget.deposit
                                      ? parseFloat(budget.deposit)
                                      : 0)
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "primary.main" }}
                              >
                                (Cobrado)
                              </Typography>
                            </Box>
                          ) : (
                            formatCurrency(
                              budget.total -
                                (budget.deposit
                                  ? parseFloat(budget.deposit)
                                  : 0)
                            )
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {new Date(budget.createdAt).toLocaleDateString(
                            "es-AR"
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.expirationDate
                            ? new Date(
                                budget.expirationDate
                              ).toLocaleDateString("es-AR")
                            : "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip
                            label={budget.status}
                            size="small"
                            color={
                              budget.status === "aprobado"
                                ? "success"
                                : budget.status === "rechazado"
                                ? "error"
                                : budget.status === "cobrado"
                                ? "primary"
                                : "warning"
                            }
                            variant="filled"
                          />
                        </TableCell>
                        {rubro !== "Todos los rubros" && (
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 1,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (budget.status !== "cobrado") {
                                    setBudgetToConvert(budget);
                                    setIsConvertModalOpen(true);
                                  }
                                }}
                                disabled={budget.status === "cobrado"}
                                title={
                                  budget.status === "cobrado"
                                    ? "Presupuesto ya cobrado"
                                    : "Cobrar como venta"
                                }
                                sx={{
                                  color:
                                    budget.status === "cobrado"
                                      ? "text.disabled"
                                      : "text.secondary",
                                  "&:hover":
                                    budget.status !== "cobrado"
                                      ? {
                                          backgroundColor: "success.main",
                                          color: "white",
                                        }
                                      : {},
                                }}
                              >
                                <ShoppingCart fontSize="small" />
                              </IconButton>

                              {handleDownloadPDF(budget)}

                              <IconButton
                                size="small"
                                onClick={() => handleShowNotes(budget)}
                                disabled={!budget.customerId}
                                title={
                                  !budget.customerId
                                    ? "No hay presupuesto asociado"
                                    : "Ver notas del presupuesto"
                                }
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Note fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(budget)}
                                title="Editar presupuesto"
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(budget)}
                                title="Eliminar presupuesto"
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "error.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ py: 4, textAlign: "center" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.disabled",
                          }}
                        >
                          <Description
                            sx={{
                              fontSize: 64,
                              mb: 2,
                              color: theme.palette.text.disabled,
                            }}
                          />
                          <Typography>
                            {searchQuery
                              ? "No se encontraron presupuestos"
                              : "No hay presupuestos registrados"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredBudgets.length > 0 && (
            <Pagination
              text="Presupuestos por página"
              text2="Total de presupuestos"
              totalItems={filteredBudgets.length}
            />
          )}
        </Box>

        {isConvertModalOpen && budgetToConvert && (
          <ConvertToSaleModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            budget={budgetToConvert}
            onConfirm={handleConvertToSale}
          />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBudget(null);
            setNewBudget({
              date: new Date().toISOString(),
              customerName: "",
              customerPhone: "",
              items: [],
              total: 0,
              deposit: "",
              remaining: 0,
              expirationDate: "",
              notes: "",
              status: "pendiente",
            });
            setSelectedCustomer(null);
          }}
          title={editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}
          buttons={
            <>
              <Button
                variant="contained"
                onClick={editingBudget ? handleUpdateBudget : handleAddBudget}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                {editingBudget ? "Actualizar" : "Crear"}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBudget(null);
                  setNewBudget({
                    date: new Date().toISOString(),
                    customerName: "",
                    customerPhone: "",
                    items: [],
                    total: 0,
                    deposit: "",
                    remaining: 0,
                    expirationDate: "",
                    notes: "",
                    status: "pendiente",
                  });
                  setSelectedCustomer(null);
                }}
                sx={{
                  color: theme.palette.text.secondary,
                  borderColor: theme.palette.divider,
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                  },
                }}
              >
                Cancelar
              </Button>
            </>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Cliente existente
              </Typography>
              <Autocomplete
                options={customerOptions}
                value={selectedCustomer}
                onChange={handleCustomerSelect}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Buscar cliente"
                    size="small"
                  />
                )}
                isOptionEqualToValue={(option, value) =>
                  option.value === value.value
                }
                noOptionsText="Sin opciones"
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ width: "50%" }}>
                <Input
                  label="Nombre del cliente"
                  value={newBudget.customerName}
                  onRawChange={(e) =>
                    setNewBudget({ ...newBudget, customerName: e.target.value })
                  }
                  placeholder="Ingrese el nombre del cliente"
                  required
                  disabled={!!selectedCustomer}
                />
              </Box>
              <Box sx={{ width: "50%" }}>
                <Input
                  label="Teléfono (opcional)"
                  value={newBudget.customerPhone || ""}
                  onRawChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      customerPhone: e.target.value,
                    })
                  }
                  placeholder="Ingrese el teléfono"
                  disabled={!!selectedCustomer}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ width: "50%" }}>
                <CustomDatePicker
                  label="Fecha de expiración"
                  value={newBudget.expirationDate || ""}
                  onChange={(date) =>
                    setNewBudget({ ...newBudget, expirationDate: date || "" })
                  }
                />
              </Box>
              <Box sx={{ width: "50%" }}>
                <Typography
                  variant="subtitle2"
                  fontWeight="medium"
                  sx={{ mb: 1 }}
                >
                  Estado
                </Typography>
                <Autocomplete
                  options={statusOptions}
                  value={
                    newBudget?.status
                      ? statusOptions.find(
                          (option) => option.value === newBudget.status
                        ) || null
                      : null
                  }
                  onChange={(
                    event: SyntheticEvent,
                    newValue: StatusOption | null
                  ) => {
                    if (newValue) {
                      setNewBudget({
                        ...newBudget,
                        status: newValue.value,
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} size="small" />
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                  noOptionsText="Sin opciones"
                />
              </Box>
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="medium"
                sx={{ mb: 1 }}
              >
                Productos
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  multiple
                  options={productOptions}
                  value={newBudget.items.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.productId
                    );
                    return {
                      value: item.productId,
                      label: `${item.productName}${
                        item.size ? ` (${item.size})` : ""
                      }${item.color ? ` - ${item.color}` : ""}`,
                      product: product!,
                      isDisabled: false,
                    } as ProductOption;
                  })}
                  onChange={handleProductSelect}
                  disableCloseOnSelect
                  getOptionLabel={(option) => option.label}
                  getOptionDisabled={getOptionDisabled}
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option.label}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar productos"
                      size="small"
                    />
                  )}
                  noOptionsText="Sin opciones"
                />
              </Box>

              {newBudget.items.length > 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ maxHeight: "200px", overflow: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow
                            sx={{ backgroundColor: theme.palette.primary.main }}
                          >
                            <TableCell
                              sx={{ color: "white", fontWeight: "bold" }}
                            >
                              Producto
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Unidad
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Cantidad
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Descuento (%)
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Precio Unit.
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Subtotal
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Acciones
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {newBudget.items.map((item) => {
                            const product = products.find(
                              (p) => p.id === item.productId
                            );
                            return (
                              <TableRow key={item.productId}>
                                <TableCell>
                                  {item.productName}
                                  {item.size && ` (${item.size})`}
                                  {item.color && ` - ${item.color}`}
                                </TableCell>
                                <TableCell>
                                  {product?.unit === "Unid." ? (
                                    <Typography
                                      variant="body2"
                                      sx={{ textAlign: "center" }}
                                    >
                                      Unidad
                                    </Typography>
                                  ) : (
                                    <Autocomplete
                                      options={
                                        product
                                          ? getCompatibleUnits(product.unit)
                                          : []
                                      }
                                      value={unitOptions.find(
                                        (option) => option.value === item.unit
                                      )}
                                      onChange={(
                                        event: SyntheticEvent,
                                        newValue: UnitOption | null
                                      ) => {
                                        if (newValue && product) {
                                          handleUnitChange(
                                            item.productId,
                                            newValue,
                                            item.quantity
                                          );
                                        }
                                      }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          placeholder="Unidad"
                                          size="small"
                                        />
                                      )}
                                      isOptionEqualToValue={(option, value) =>
                                        option.value === value.value
                                      }
                                      noOptionsText="No se encontraron opciones"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step={
                                      item.unit === "Kg" || item.unit === "L"
                                        ? "0.001"
                                        : "1"
                                    }
                                    value={
                                      item.quantity === 0 ? "" : item.quantity
                                    }
                                    onRawChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "") {
                                        handleQuantityChange(
                                          item.productId,
                                          0,
                                          item.unit
                                        );
                                      } else {
                                        const numValue = parseFloat(value);
                                        if (!isNaN(numValue)) {
                                          handleQuantityChange(
                                            item.productId,
                                            Math.max(0.001, numValue),
                                            item.unit
                                          );
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (
                                        e.target.value === "" ||
                                        parseFloat(e.target.value) < 0.001
                                      ) {
                                        handleQuantityChange(
                                          item.productId,
                                          1,
                                          item.unit
                                        );
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    value={
                                      item.discount === 0 ? "" : item.discount
                                    }
                                    onRawChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^[0-9]*$/.test(value)
                                      ) {
                                        handleDiscountChange(
                                          item.productId,
                                          value
                                        );
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === "") {
                                        handleDiscountChange(
                                          item.productId,
                                          "0"
                                        );
                                      } else {
                                        const numValue = parseInt(
                                          e.target.value
                                        );
                                        if (isNaN(numValue)) {
                                          handleDiscountChange(
                                            item.productId,
                                            "0"
                                          );
                                        } else if (numValue < 0) {
                                          handleDiscountChange(
                                            item.productId,
                                            "0"
                                          );
                                        } else if (numValue > 100) {
                                          handleDiscountChange(
                                            item.productId,
                                            "100"
                                          );
                                        }
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  {formatCurrency(item.price)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  {formatCurrency(
                                    item.price *
                                      item.quantity *
                                      (1 - (item.discount || 0) / 100)
                                  )}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  <IconButton
                                    onClick={() =>
                                      handleRemoveProduct(item.productId)
                                    }
                                    size="small"
                                    sx={{
                                      color: "error.main",
                                      "&:hover": {
                                        color: "error.dark",
                                      },
                                    }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    <Divider />

                    <Box sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box sx={{ width: "50%" }}>
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <Box sx={{ width: "50%" }}>
                              <Input
                                label="Seña en efectivo (opcional)"
                                type="number"
                                value={newBudget.deposit}
                                onRawChange={(e) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(value)
                                  ) {
                                    const depositValue =
                                      value === "" ? 0 : parseFloat(value);
                                    const remaining =
                                      newBudget.total - depositValue;
                                    setNewBudget({
                                      ...newBudget,
                                      deposit: value,
                                      remaining,
                                    });
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === "") {
                                    setNewBudget({
                                      ...newBudget,
                                      deposit: "",
                                      remaining: newBudget.total,
                                    });
                                  } else {
                                    const numValue = parseFloat(e.target.value);
                                    if (isNaN(numValue)) {
                                      setNewBudget({
                                        ...newBudget,
                                        deposit: "",
                                        remaining: newBudget.total,
                                      });
                                    }
                                  }
                                }}
                                placeholder="Ingrese el monto de la seña"
                              />
                            </Box>
                            <Box sx={{ width: "50%" }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight="medium"
                                sx={{ mb: 1 }}
                              >
                                Saldo restante
                              </Typography>
                              <Box
                                sx={{
                                  p: 1,
                                  border: 1,
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  backgroundColor: "background.paper",
                                }}
                              >
                                {formatCurrency(newBudget.remaining)}
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ width: "50%", textAlign: "right" }}>
                          <Typography variant="h6" fontWeight="bold">
                            Total: {formatCurrency(newBudget.total)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
          buttons={
            <>
              <Button
                variant="contained"
                onClick={handleConfirmDelete}
                sx={{
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
                }}
              >
                Eliminar
              </Button>
              <Button
                variant="text"
                onClick={() => setIsDeleteModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.secondary",
                  },
                }}
              >
                Cancelar
              </Button>
            </>
          }
        >
          <Typography>
            ¿Está seguro que desea eliminar el presupuesto de{" "}
            {budgetToDelete?.customerName}?
          </Typography>
        </Modal>

        {selectedCustomerForNotes && (
          <CustomerNotes
            customerId={selectedCustomerForNotes.id}
            customerName={selectedCustomerForNotes.name}
            isOpen={notesModalOpen}
            onClose={() => setNotesModalOpen(false)}
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

export default PresupuestosPage;

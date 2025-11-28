"use client";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  DailyCashMovement,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Product,
  Supplier,
  UnifiedFilter,
} from "@/app/lib/types/types";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/app/database/db";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getYear,
} from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "@/app/components/Select";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import { formatCurrency } from "@/app/lib/utils/currency";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { usePagination } from "@/app/context/PaginationContext";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import { toCapitalize } from "@/app/lib/utils/capitalizeText";
import Image from "next/image";

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
  IconButton,
  useTheme,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";

// Componentes personalizados
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const MovimientosPage = () => {
  const router = useRouter();
  const theme = useTheme();

  const { rubro } = useRubro();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
    useState(false);
  const [categoryToDelete] = useState<ExpenseCategory | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [shouldRedirectToCash, setShouldRedirectToCash] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id">>({
    amount: 0,
    date: new Date().toISOString(),
    description: "",
    category: "",
    paymentMethod: "EFECTIVO",
    receipt: null,
    installments: 1,
    rubro: rubro,
    supplier: "",
    type: "EGRESO",
  });
  const [newCategory, setNewCategory] = useState<Omit<ExpenseCategory, "id">>({
    name: "",
    rubro: rubro,
    type: "EGRESO",
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [filters, setFilters] = useState<UnifiedFilter[]>([]);
  const { currentPage, itemsPerPage } = usePagination();

  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const monthOptions = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));

  const recalculateTotals = (movements: DailyCashMovement[]) => {
    return movements.reduce(
      (totals, m) => {
        const amount = m.amount || 0;
        const isIncome = m.type === "INGRESO";
        const isCash = m.paymentMethod === "EFECTIVO";

        if (isIncome) {
          totals.totalIncome += amount;
          if (isCash) {
            totals.cashIncome += amount;
          } else {
            totals.otherIncome += amount;
          }
        } else if (m.type === "EGRESO") {
          totals.totalExpense += amount;
          if (isCash) {
            totals.cashExpense += amount;
          }
        }
        return totals;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        cashIncome: 0,
        cashExpense: 0,
        otherIncome: 0,
      }
    );
  };

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 2500);
  };

  const loadSuppliers = useCallback(async () => {
    try {
      const storedSuppliers = await db.suppliers.toArray();
      const filteredSuppliers = storedSuppliers.filter(
        (s) =>
          !rubro ||
          rubro === "Todos los rubros" ||
          !s.rubro ||
          s.rubro === "Todos los rubros" ||
          s.rubro.toLowerCase() === rubro.toLowerCase()
      );
      setSuppliers(filteredSuppliers);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
      showNotification("Error al cargar proveedores", "error");
    }
  }, [rubro]);

  const loadCategories = useCallback(async () => {
    const storedCategories = await db.expenseCategories.toArray();
    const filtered = storedCategories.filter(
      (cat) =>
        (cat.rubro === rubro || cat.rubro === "Todos los rubros") &&
        (newExpense.type === "TODOS" || cat.type === newExpense.type)
    );
    setCategories(filtered);
  }, [rubro]);

  const loadExpenses = useCallback(async () => {
    try {
      const storedExpenses = await db.expenses.toArray();
      const sortedExpenses = storedExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setExpenses(sortedExpenses);

      const expenseDates = [
        ...new Set(storedExpenses.map((e) => e.date.split("T")[0])),
      ];

      for (const date of expenseDates) {
        const dailyCash = await db.dailyCashes.get({ date });
        if (dailyCash) {
          const validMovements = dailyCash.movements.filter(() => true);

          if (validMovements.length !== dailyCash.movements.length) {
            const updatedCash = {
              ...dailyCash,
              movements: validMovements,
              ...recalculateTotals(validMovements),
            };
            await db.dailyCashes.update(dailyCash.id, updatedCash);
          }
        }
      }
    } catch (error) {
      console.error("Error al cargar gastos:", error);
      showNotification("Error al cargar gastos", "error");
    }
  }, []);

  const handleOpenModal = async () => {
    const { needsRedirect } = await ensureCashIsOpen();
    if (needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }
    setIsOpenModal(true);
  };

  const handleApplyFilters = useCallback((filters: UnifiedFilter[]) => {
    setFilters(
      filters.map((filter) => ({
        field: filter.field as keyof Expense,
        value: filter.value,
      }))
    );
  }, []);

  const handleApplySort = (sort: {
    field: keyof Product | keyof Expense;
    direction: "asc" | "desc";
  }) => {
    setExpenses((prev) =>
      [...prev].sort((a, b) => {
        const field = sort.field;
        const direction = sort.direction === "asc" ? 1 : -1;

        if (field === "amount") {
          return direction * (a.amount - b.amount);
        }
        if (field === "date") {
          return (
            direction *
            (new Date(a.date).getTime() - new Date(b.date).getTime())
          );
        }
        if (field === "description") {
          return direction * a.description.localeCompare(b.description);
        }
        if (field === "category") {
          return direction * a.category.localeCompare(b.category);
        }
        if (field === "paymentMethod") {
          return direction * a.paymentMethod.localeCompare(b.paymentMethod);
        }
        return 0;
      })
    );
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      showNotification("Complete todos los campos obligatorios", "error");
      return;
    }

    try {
      const totalPayment = newExpense.combinedPaymentMethods
        ? newExpense.combinedPaymentMethods.reduce(
            (sum, m) => sum + (m.amount || 0),
            0
          )
        : newExpense.amount;

      const expenseToAdd = {
        ...newExpense,
        id: Date.now(),
        rubro: rubro,
        amount: totalPayment,
      };

      // Registrar el movimiento en expenses
      await db.expenses.add(expenseToAdd);

      // Obtener la fecha correctamente formateada
      const expenseDate = new Date(newExpense.date);
      const localDateString = expenseDate.toISOString().split("T")[0];

      // Obtener o crear la caja diaria
      let dailyCash = await db.dailyCashes.get({ date: localDateString });

      if (!dailyCash) {
        // Si no existe, obtener los movimientos existentes para esa fecha
        const existingMovements = await db.dailyCashes
          .where("date")
          .equals(localDateString)
          .first();

        dailyCash = {
          id: Date.now(),
          date: localDateString,
          movements: existingMovements?.movements || [],
          closed: false,
          totalIncome: 0,
          totalExpense: 0,
          cashIncome: 0,
          cashExpense: 0,
          otherIncome: 0,
        };
        await db.dailyCashes.add(dailyCash);
      }

      // Crear el movimiento para la caja diaria
      const movement = {
        id: expenseToAdd.id,
        amount: totalPayment,
        description: newExpense.description,
        type: newExpense.type,
        paymentMethod: newExpense.paymentMethod,
        date: newExpense.date,
        rubro: rubro,
        supplierName: newExpense.supplier,
        expenseCategory: newExpense.category,
        combinedPaymentMethods: newExpense.combinedPaymentMethods,
      };

      // Actualizar la caja diaria
      const updatedMovements = [...dailyCash.movements, movement];

      const updatedCash = {
        ...dailyCash,
        movements: updatedMovements,
        totalIncome: updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0),
        totalExpense: updatedMovements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0),
        cashIncome: updatedMovements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0),
        cashExpense: updatedMovements
          .filter((m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0),
        otherIncome: updatedMovements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0),
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      // Actualizar el estado
      setExpenses((prev) => [...prev, expenseToAdd]);
      showNotification("Movimiento registrado correctamente", "success");
      resetExpenseForm();
      setIsOpenModal(false);
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      showNotification("Error al registrar movimiento", "error");
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !expenseToDelete.id) return;

    try {
      // 1. Eliminar el movimiento de la tabla de expenses
      await db.expenses.delete(expenseToDelete.id);

      // 2. Actualizar la caja diaria correspondiente
      const expenseDate = new Date(expenseToDelete.date);
      const localDateString = expenseDate
        .toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-");

      const dailyCash = await db.dailyCashes.get({ date: localDateString });

      if (dailyCash) {
        // Filtrar el movimiento eliminado
        const updatedMovements = dailyCash.movements.filter(
          (m) => m.id !== expenseToDelete.id
        );

        // Calcular nuevos totales
        const totals = updatedMovements.reduce(
          (acc, m) => {
            const amount = m.amount || 0;
            const isIncome = m.type === "INGRESO";
            const isCash = m.paymentMethod === "EFECTIVO";

            if (isIncome) {
              acc.totalIncome += amount;
              if (isCash) {
                acc.cashIncome += amount;
              } else {
                acc.otherIncome += amount;
              }
            } else if (m.type === "EGRESO") {
              acc.totalExpense += amount;
              if (isCash) {
                acc.cashExpense += amount;
              }
            }
            return acc;
          },
          {
            totalIncome: 0,
            totalExpense: 0,
            cashIncome: 0,
            cashExpense: 0,
            otherIncome: 0,
          }
        );

        // Actualizar la caja diaria con los nuevos totales
        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          ...totals,
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);

        // Si no quedan movimientos y la caja está cerrada, eliminarla
        if (updatedMovements.length === 0 && dailyCash.closed) {
          await db.dailyCashes.delete(dailyCash.id);
        }
      }

      // 3. Actualizar el estado local y recargar datos
      await loadExpenses();
      showNotification("Movimiento eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
      showNotification("Error al eliminar movimiento", "error");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      showNotification("Ingrese un nombre para la categoría", "error");
      return;
    }

    // Verificar si la categoría ya existe
    const categoryExists = categories.some(
      (cat) =>
        cat.name.toLowerCase() === newCategory.name.toLowerCase() &&
        cat.rubro === rubro
    );

    if (categoryExists) {
      showNotification("Ya existe una categoría con ese nombre", "error");
      return;
    }

    try {
      const categoryToAdd = {
        ...newCategory,
        id: Date.now(),
        rubro: rubro,
      };

      await db.expenseCategories.add(categoryToAdd);

      // Actualizar el estado local inmediatamente
      setCategories((prev) => [...prev, categoryToAdd]);

      showNotification("Categoría agregada correctamente", "success");

      // Seleccionar automáticamente la categoría recién creada
      setNewExpense((prev) => ({
        ...prev,
        category: newCategory.name,
      }));

      setNewCategory({ name: "", rubro: rubro, type: "EGRESO" });
    } catch (error) {
      console.error("Error al agregar categoría:", error);
      showNotification("Error al agregar categoría", "error");
    }
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    try {
      const expensesWithCategory = await db.expenses
        .where("category")
        .equals(category.name)
        .and((exp) => exp.rubro === rubro)
        .count();

      if (expensesWithCategory > 0) {
        showNotification(
          "No se puede eliminar la categoría porque tiene movimientos asociados",
          "error"
        );
        return;
      }

      if (category.id !== undefined) {
        await db.expenseCategories.delete(category.id);
        // Actualizar estado local
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
      }
      showNotification("Categoría eliminada correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      showNotification("Error al eliminar categoría", "error");
    }
  };

  const resetExpenseForm = () => {
    setNewExpense({
      amount: 0,
      date: new Date().toISOString(),
      description: "",
      category: "",
      paymentMethod: "EFECTIVO",
      receipt: null,
      installments: 1,
      rubro: rubro,
      supplier: "",
      type: "EGRESO",
    });
    setReceiptPreview(null);
  };

  const filteredExpenses = expenses.filter((expense) => {
    // Filtro por rubro
    if (expense.rubro !== rubro && rubro !== "Todos los rubros") return false;

    // Filtro por mes y año
    const expenseDate = parseISO(expense.date);
    if (
      !isWithinInterval(expenseDate, {
        start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
        end: endOfMonth(new Date(selectedYear, selectedMonth - 1)),
      })
    )
      return false;

    // Filtros avanzados
    if (filters.length > 0) {
      return filters.every((filter) => {
        if (filter.field === "type") return expense.type === filter.value;
        if (filter.field === "category")
          return expense.category === filter.value;
        if (filter.field === "paymentMethod")
          return expense.paymentMethod === filter.value;
        if (filter.field === "supplier")
          return expense.supplier?.includes(filter.value);
        return true;
      });
    }

    return true;
  });

  const getCategoryStats = () => {
    const stats: Record<
      string,
      {
        totalIncome: number;
        totalExpense: number;
        countIncome: number;
        countExpense: number;
      }
    > = {};

    filteredExpenses.forEach((expense) => {
      if (!stats[expense.category]) {
        stats[expense.category] = {
          totalIncome: 0,
          totalExpense: 0,
          countIncome: 0,
          countExpense: 0,
        };
      }

      if (expense.type === "INGRESO") {
        stats[expense.category].totalIncome += expense.amount;
        stats[expense.category].countIncome++;
      } else {
        stats[expense.category].totalExpense += expense.amount;
        stats[expense.category].countExpense++;
      }
    });

    const totalIncome = filteredExpenses
      .filter((e) => e.type === "INGRESO")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = filteredExpenses
      .filter((e) => e.type === "EGRESO")
      .reduce((sum, e) => sum + e.amount, 0);

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
        countIncome: data.countIncome,
        countExpense: data.countExpense,
        percentageIncome:
          totalIncome > 0 ? (data.totalIncome / totalIncome) * 100 : 0,
        percentageExpense:
          totalExpense > 0 ? (data.totalExpense / totalExpense) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.totalIncome + b.totalExpense - (a.totalIncome + a.totalExpense)
      );
  };

  const getMonthlyComparison = () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i, 1), "MMM", { locale: es }),
      totalIncome: 0,
      totalExpense: 0,
    }));

    expenses.forEach((expense) => {
      const date = parseISO(expense.date);
      if (
        getYear(date) === selectedYear &&
        (rubro === "Todos los rubros" || expense.rubro === rubro)
      ) {
        if (expense.type === "INGRESO") {
          months[date.getMonth()].totalIncome += expense.amount;
        } else {
          months[date.getMonth()].totalExpense += expense.amount;
        }
      }
    });

    return months;
  };

  useEffect(() => {
    if (shouldRedirectToCash) {
      router.push("/caja-diaria");
    }
  }, [shouldRedirectToCash, router]);

  useEffect(() => {
    loadSuppliers();
    loadCategories();
    loadExpenses();
  }, [rubro, loadSuppliers, loadCategories, loadExpenses]);

  const indexOfLastExpense = currentPage * itemsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(
    indexOfFirstExpense,
    indexOfLastExpense
  );

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 5,
          py: 2,
          color: "text.secondary",
          height: "calc(100vh - 80px)",
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
          Movimientos
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            gap: 2,
          }}
        >
          <Box
            sx={{ display: "flex", width: "100%", maxWidth: "20rem", gap: 2 }}
          >
            <Select
              label="Mes"
              options={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
            <Select
              label="Año"
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <AdvancedFilterPanel
              key={`${rubro}-filter`}
              data={expenses}
              onApplyFilters={handleApplyFilters}
              onApplySort={handleApplySort}
              rubro={rubro}
              isExpense={true}
            />
          </Box>
          {rubro !== "Todos los rubros" && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 2,
              }}
            >
              <Button
                variant="contained"
                startIcon={<AnalyticsIcon />}
                onClick={() => setIsStatsModalOpen(true)}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                Estadísticas
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenModal}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                Nuevo Movimiento
              </Button>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "calc(100vh - 200px)",
          }}
        >
          <Box sx={{ maxHeight: "calc(100vh - 250px)", overflow: "auto" }}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      color: "white",
                    }}
                  >
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Tipo
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Descripción
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Categoría
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Proveedor
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Método de Pago
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Monto
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
                  {currentExpenses.length > 0 ? (
                    currentExpenses.map((expense) => (
                      <TableRow
                        key={expense.id}
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
                        <TableCell>
                          <Chip
                            label={expense.type}
                            size="small"
                            color={
                              expense.type === "INGRESO" ? "success" : "error"
                            }
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: "medium", textAlign: "center" }}
                        >
                          {expense.description}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {format(parseISO(expense.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {toCapitalize(expense.category)}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {expense.supplier || "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {expense.paymentMethod}
                        </TableCell>
                        <TableCell
                          sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            color: "error.main",
                          }}
                        >
                          {formatCurrency(expense.amount)}
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
                              {expense.receipt && (
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setReceiptPreview(expense.receipt || null)
                                  }
                                  title="Ver comprobante"
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                >
                                  <DescriptionIcon fontSize="small" />
                                </IconButton>
                              )}
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setNewExpense({
                                    ...expense,
                                    date: expense.date,
                                  });
                                  if (expense.receipt)
                                    setReceiptPreview(expense.receipt);
                                  setIsOpenModal(true);
                                }}
                                title="Editar"
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setExpenseToDelete(expense);
                                  setIsDeleteModalOpen(true);
                                }}
                                title="Eliminar"
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "error.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
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
                          <FileText
                            size={64}
                            style={{
                              marginBottom: 16,
                              color: theme.palette.text.disabled,
                            }}
                          />
                          <Typography>
                            No hay movimientos registrados.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          {filteredExpenses.length > 0 && (
            <Pagination
              text="Movimientos por página"
              text2="Total de Movimientos"
              totalItems={filteredExpenses.length}
            />
          )}
        </Box>

        {/* Modal para eliminar categoría */}
        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          buttons={
            <>
              <Button
                variant="contained"
                onClick={() => {
                  if (categoryToDelete) {
                    handleDeleteCategory(categoryToDelete);
                  }
                }}
                sx={{
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
                }}
              >
                Confirmar
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsCategoryDeleteModalOpen(false)}
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
            ¿Está seguro que desea eliminar la categoría{" "}
            <span style={{ fontWeight: "bold" }}>{categoryToDelete?.name}</span>
            ?
          </Typography>
        </Modal>

        {/* Modal para nuevo/editar movimiento */}
        <Modal
          isOpen={isOpenModal}
          onClose={() => {
            setIsOpenModal(false);
            resetExpenseForm();
          }}
          title={newExpense.amount ? "Editar Movimiento" : "Nuevo Movimiento"}
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleAddExpense}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                {newExpense.date ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setIsOpenModal(false);
                  resetExpenseForm();
                }}
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
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Select
                label="Tipo*"
                options={[
                  { value: "INGRESO", label: "Ingreso" },
                  { value: "EGRESO", label: "Egreso" },
                ]}
                value={newExpense.type}
                onChange={(value) => {
                  setNewExpense({
                    ...newExpense,
                    type: value as "INGRESO" | "EGRESO",
                  });
                  loadCategories();
                }}
              />
              <Select
                label="Proveedor"
                options={[
                  { value: "", label: "Seleccionar proveedor" },
                  ...suppliers.map((supplier) => ({
                    value: supplier.companyName,
                    label: supplier.companyName,
                  })),
                ]}
                value={selectedSupplier}
                onChange={(value) => {
                  setSelectedSupplier(value);
                  setNewExpense((prev) => ({
                    ...prev,
                    supplier: value,
                  }));
                }}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Select
                  label="Categoría*"
                  options={[
                    { value: "", label: "Seleccionar categoría" },
                    ...categories.map((category) => ({
                      value: category.name,
                      label: category.name,
                    })),
                  ]}
                  value={newExpense.category}
                  onChange={(value) => {
                    setNewExpense({
                      ...newExpense,
                      category: value,
                    });
                  }}
                />
              </Box>

              {/* Campo para crear nueva categoría - usando Input personalizado */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-end",
                  p: 1.5,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Input
                  label="Crear nueva categoría"
                  placeholder="Ingrese nombre de nueva categoría (Ej: Alquiler, Servicios, Insumos)"
                  value={toCapitalize(newCategory.name)}
                  onRawChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      name: toCapitalize(e.target.value),
                    })
                  }
                  helperText="La categoría se agregará y seleccionará automáticamente"
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddCategory}
                  disabled={!newCategory.name.trim()}
                  sx={{
                    backgroundColor: theme.palette.success.main,
                    "&:hover": {
                      backgroundColor: theme.palette.success.dark,
                    },
                    minWidth: "120px",
                    height: "40px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Crear Categoría
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <InputCash
                label="Monto*"
                value={newExpense.amount}
                onChange={(value) =>
                  setNewExpense({ ...newExpense, amount: value })
                }
              />
              <Select
                label="Forma de pago*"
                options={paymentOptions}
                value={newExpense.paymentMethod}
                onChange={(value) =>
                  setNewExpense({
                    ...newExpense,
                    paymentMethod: value as PaymentMethod,
                  })
                }
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <CustomDatePicker
                value={newExpense.date}
                onChange={(newDate) => {
                  setNewExpense({
                    ...newExpense,
                    date: newDate || new Date().toISOString(),
                  });
                }}
              />
              <Input
                label="Descripción*"
                placeholder="Concepto"
                value={newExpense.description}
                onRawChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                fullWidth
              />
            </Box>

            {newExpense.paymentMethod === "TARJETA" && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Input
                  label="Cuotas"
                  type="number"
                  placeholder="Número de cuotas"
                  value={newExpense.installments?.toString() || "1"}
                  onRawChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      installments: parseInt(e.target.value) || 1,
                    })
                  }
                  fullWidth
                />
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="body2">
                    {(newExpense.installments ?? 1) > 1
                      ? `${formatCurrency(
                          newExpense.amount / (newExpense.installments ?? 1)
                        )} por cuota`
                      : "Pago en una sola cuota"}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Modal>

        {/* Modal de confirmación para eliminar movimiento */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleDeleteExpense}
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
                variant="outlined"
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
            </Box>
          }
        >
          <Typography>
            ¿Está seguro que desea eliminar el movimiento?
          </Typography>
        </Modal>

        {/* Modal de estadísticas */}
        <Modal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          title="Estadísticas de Movimientos"
          buttons={
            <Button
              variant="outlined"
              onClick={() => setIsStatsModalOpen(false)}
              sx={{
                color: "text.secondary",
                borderColor: "divider",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.secondary",
                },
              }}
            >
              Cerrar
            </Button>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Ingresos por Categoría
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Pie
                      data={{
                        labels: getCategoryStats()
                          .filter((item) => item.totalIncome > 0)
                          .map((item) => item.category),
                        datasets: [
                          {
                            data: getCategoryStats()
                              .filter((item) => item.totalIncome > 0)
                              .map((item) => item.totalIncome),
                            backgroundColor: [
                              "#AA6384",
                              "#36A2EB",
                              "#FFCE56",
                              "#4BC0C0",
                              "#9966FF",
                              "#FF9F40",
                              "#8AC24A",
                              "#607D8B",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `${context.label}: ${formatCurrency(
                                  context.raw as number
                                )} (${context.formattedValue}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Egresos por Categoría
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Pie
                      data={{
                        labels: getCategoryStats()
                          .filter((item) => item.totalExpense > 0)
                          .map((item) => item.category),
                        datasets: [
                          {
                            data: getCategoryStats()
                              .filter((item) => item.totalExpense > 0)
                              .map((item) => item.totalExpense),
                            backgroundColor: [
                              "#AA6384",
                              "#36A2EB",
                              "#FFCE56",
                              "#4BC0C0",
                              "#9966FF",
                              "#FF9F40",
                              "#8AC24A",
                              "#607D8B",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `${context.label}: ${formatCurrency(
                                  context.raw as number
                                )} (${context.formattedValue}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparativa Mensual de Ingresos - {selectedYear}
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={{
                        labels: getMonthlyComparison().map(
                          (item) => item.month
                        ),
                        datasets: [
                          {
                            label: "Ingresos",
                            data: getMonthlyComparison().map(
                              (item) => item.totalIncome
                            ),
                            backgroundColor: "#4BC0C0",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `Ingresos: ${formatCurrency(
                                  context.raw as number
                                )}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function (value) {
                                return formatCurrency(value as number);
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparativa Mensual de Egresos - {selectedYear}
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={{
                        labels: getMonthlyComparison().map(
                          (item) => item.month
                        ),
                        datasets: [
                          {
                            label: "Egresos",
                            data: getMonthlyComparison().map(
                              (item) => item.totalExpense
                            ),
                            backgroundColor: "#FF6384",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `Egresos: ${formatCurrency(
                                  context.raw as number
                                )}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function (value) {
                                return formatCurrency(value as number);
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Modal>

        {/* Modal para ver comprobante */}
        {receiptPreview && (
          <Modal
            isOpen={!!receiptPreview}
            onClose={() => setReceiptPreview(null)}
            title="Comprobante del Movimiento"
            buttons={
              <Button
                variant="outlined"
                onClick={() => setReceiptPreview(null)}
                sx={{
                  color: "text.secondary",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.secondary",
                  },
                }}
              >
                Cerrar
              </Button>
            }
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {receiptPreview.startsWith("data:image") ? (
                <Image
                  src={receiptPreview}
                  alt="Comprobante"
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 8,
                  }}
                >
                  <DescriptionIcon
                    sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ color: "text.primary", mb: 2 }}
                  >
                    Comprobante en formato PDF
                  </Typography>
                  <Button
                    variant="contained"
                    href={receiptPreview}
                    download="comprobante.pdf"
                    sx={{
                      backgroundColor: "primary.main",
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    }}
                  >
                    Descargar PDF
                  </Button>
                </Box>
              )}
            </Box>
          </Modal>
        )}

        {/* Notificación */}
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default MovimientosPage;

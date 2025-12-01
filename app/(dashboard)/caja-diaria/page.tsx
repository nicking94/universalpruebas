"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  Chip,
  IconButton,
} from "@mui/material";
import { Add, Close, Info, PointOfSale } from "@mui/icons-material";
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/app/database/db";
import { format, parseISO, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { formatCurrency } from "@/app/lib/utils/currency";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { usePagination } from "@/app/context/PaginationContext";
import Notification from "@/app/components/Notification";
import {
  DailyCash,
  DailyCashMovement,
  MonthOption,
  Option,
  PaymentMethod,
} from "@/app/lib/types/types";
import Pagination from "@/app/components/Pagination";
import Select from "@/app/components/Select";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import { useNotification } from "@/app/hooks/useNotification";

const CajaDiariaPage = () => {
  const { rubro } = useRubro();
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayMovements, setSelectedDayMovements] = useState<
    DailyCashMovement[]
  >([]);

  const [filterType, setFilterType] = useState<"TODOS" | "INGRESO" | "EGRESO">(
    "TODOS"
  );
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<
    PaymentMethod | "TODOS"
  >("TODOS");

  const paymentOptions: Option[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const { currentPage, itemsPerPage } = usePagination();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );

  // Funciones memoizadas para mejor performance
  const getFilteredMovements = useCallback(() => {
    return selectedDayMovements.filter((movement) => {
      const typeMatch =
        filterType === "TODOS" ||
        movement.type === filterType ||
        (movement.paymentMethod === "CHEQUE" &&
          movement.isCreditPayment &&
          filterType === "INGRESO");

      let paymentMatch = false;
      if (filterPaymentMethod === "TODOS") {
        paymentMatch = true;
      } else {
        if (movement.combinedPaymentMethods) {
          paymentMatch = movement.combinedPaymentMethods.some(
            (m) => m.method === filterPaymentMethod
          );
        } else {
          paymentMatch = movement.paymentMethod === filterPaymentMethod;
        }
      }

      return typeMatch && paymentMatch;
    });
  }, [selectedDayMovements, filterType, filterPaymentMethod]);

  const calculateFilteredTotals = useCallback(() => {
    const filtered = getFilteredMovements();

    const totals = filtered.reduce(
      (acc, movement) => {
        if (
          movement.type === "INGRESO" ||
          (movement.paymentMethod === "CHEQUE" && movement.isCreditPayment)
        ) {
          acc.totalIngresos += Number(movement.amount) || 0;
        } else if (movement.type === "EGRESO") {
          acc.totalEgresos += Number(movement.amount) || 0;
        }
        return acc;
      },
      { totalIngresos: 0, totalEgresos: 0 }
    );

    return totals;
  }, [getFilteredMovements]);

  const openDetailModal = useCallback((movements: DailyCashMovement[]) => {
    setSelectedDayMovements(movements);
    setIsDetailModalOpen(true);
  }, []);

  const monthOptions: MonthOption[] = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));

  const checkAndCloseOldCashes = useCallback(async () => {
    const today = getLocalDateString();
    try {
      const allCashes = await db.dailyCashes.toArray();
      const openPreviousCashes = allCashes.filter(
        (cash) => !cash.closed && cash.date < today
      );

      if (openPreviousCashes.length === 0) return;

      for (const cash of openPreviousCashes) {
        const cashIncome = cash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        const cashExpense = cash.movements
          .filter((m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        const updatedCash = {
          ...cash,
          closed: true,
          cashIncome,
          cashExpense,
          otherIncome: cash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          closingDifference: 0,
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(cash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === cash.id ? updatedCash : dc))
        );

        if (currentDailyCash && currentDailyCash.id === cash.id) {
          setCurrentDailyCash(updatedCash);
        }
      }

      showNotification(
        `Se cerraron ${openPreviousCashes.length} caja(s) de días anteriores automáticamente.`,
        "info"
      );
    } catch (error) {
      console.error("Error al cerrar cajas antiguas:", error);
      showNotification("Error al cerrar cajas de días anteriores", "error");
    }
  }, [currentDailyCash, showNotification]);

  const openCash = useCallback(async () => {
    const today = getLocalDateString();
    const allCashes = await db.dailyCashes.toArray();
    const openPreviousCashes = allCashes.filter(
      (cash) => !cash.closed && cash.date < today
    );

    if (openPreviousCashes.length > 0) {
      await checkAndCloseOldCashes();
      return;
    }

    try {
      if (currentDailyCash?.closed) {
        const updatedCash = {
          ...currentDailyCash,
          closed: false,
          closingAmount: undefined,
          cashIncome: 0,
          cashExpense: 0,
          otherIncome: undefined,
          closingDifference: undefined,
          closingDate: undefined,
          movements: currentDailyCash.movements,
        };

        await db.dailyCashes.update(currentDailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === currentDailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        showNotification("Caja reabierta correctamente", "success");
        return;
      }

      const dailyCash: DailyCash = {
        id: Date.now(),
        date: today,
        movements: [],
        closed: false,
        totalIncome: 0,
        totalExpense: 0,
      };

      await db.dailyCashes.add(dailyCash);
      setDailyCashes((prev) => [...prev, dailyCash]);
      setCurrentDailyCash(dailyCash);
      showNotification("Caja abierta correctamente", "success");
    } catch (error) {
      console.error("Error al abrir/reabrir caja:", error);
      showNotification("Error al abrir/reabrir caja", "error");
    }
  }, [currentDailyCash, checkAndCloseOldCashes, showNotification]);

  const closeCash = useCallback(async () => {
    try {
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const cashIncome = dailyCash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const cashExpense = dailyCash.movements
          .filter((m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const updatedCash = {
          ...dailyCash,
          closed: true,
          cashIncome,
          cashExpense,
          otherIncome: dailyCash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + (m.amount || 0), 0),
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        showNotification("Caja cerrada correctamente", "success");
      }
    } catch (error) {
      console.error("Error al cerrar caja:", error);
      showNotification("Error al cerrar caja", "error");
    }
  }, [showNotification]);

  const getDailySummary = useCallback(() => {
    const summary: Record<
      string,
      {
        date: string;
        ingresos: number;
        egresos: number;
        ganancia: number;
        gananciaNeta: number;
        movements: DailyCashMovement[];
        closed: boolean;
      }
    > = {};

    dailyCashes.forEach((dailyCash) => {
      const date = dailyCash.date;
      const movements = dailyCash.movements;

      if (!summary[date]) {
        summary[date] = {
          date,
          ingresos: 0,
          egresos: 0,
          ganancia: 0,
          gananciaNeta: 0,
          movements: [...movements],
          closed: dailyCash.closed || false,
        };
      }

      movements.forEach((movement) => {
        const amount = Number(movement.amount) || 0;

        if (movement.type === "INGRESO") {
          summary[date].ingresos += amount;
          summary[date].gananciaNeta += Number(movement.profit) || 0;
        } else {
          summary[date].egresos += amount;
          summary[date].gananciaNeta -= Math.abs(Number(movement.profit) || 0);
        }
      });

      summary[date].ganancia = summary[date].ingresos - summary[date].egresos;
    });

    return Object.values(summary)
      .filter((item) => {
        const date = parseISO(item.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyCashes, selectedMonth, selectedYear]);

  const dailySummaries = useMemo(() => getDailySummary(), [getDailySummary]);

  // Efectos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedDailyCashes = await db.dailyCashes.toArray();
        const cleanedCashes = storedDailyCashes.map((cash) => ({
          ...cash,
          movements: cash.movements.map((m) => ({
            ...m,
            amount: Number(m.amount) || 0,
          })),
        }));

        setDailyCashes(cleanedCashes);
      } catch (error) {
        console.error("Error al cargar cajas diarias:", error);
        showNotification("Error al cargar cajas diarias", "error");
      }
    };

    fetchData();
  }, [showNotification]);

  useEffect(() => {
    const checkMidnightAndClose = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        checkAndCloseOldCashes();
      }
    };

    const interval = setInterval(checkMidnightAndClose, 5 * 60 * 1000);
    checkMidnightAndClose();

    return () => clearInterval(interval);
  }, [checkAndCloseOldCashes]);

  useEffect(() => {
    checkAndCloseOldCashes();
  }, [checkAndCloseOldCashes]);

  useEffect(() => {
    const checkInitialCashStatus = async () => {
      await checkAndCloseOldCashes();
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        setCurrentDailyCash(dailyCash);
      }
    };

    checkInitialCashStatus();
  }, [checkAndCloseOldCashes]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dailySummaries.slice(indexOfFirstItem, indexOfLastItem);

  // Componente DetailModal
  const DetailModal = useCallback(() => {
    const filteredMovements = getFilteredMovements();
    const { totalIngresos, totalEgresos } = calculateFilteredTotals();

    const groupedMovements = filteredMovements.reduce((acc, movement) => {
      const movementKey = movement.items
        ? `sale-${movement.date}-${movement.items
            .map((item) => item.productId)
            .join("-")}`
        : movement.id;

      if (!acc[movementKey]) {
        acc[movementKey] = {
          ...movement,
          subMovements: movement.combinedPaymentMethods ? [] : undefined,
        };
      }

      if (movement.combinedPaymentMethods) {
        movement.combinedPaymentMethods.forEach((paymentMethod) => {
          acc[movementKey].subMovements!.push({
            ...movement,
            id: Math.random(),
            paymentMethod: paymentMethod.method,
            amount: paymentMethod.amount,
            description: `${movement.description} - ${paymentMethod.method}`,
          });
        });
      }

      return acc;
    }, {} as Record<string, DailyCashMovement>);

    const modalButtons = (
      <Button
        variant="text"
        onClick={() => {
          setIsDetailModalOpen(false);
          setFilterType("TODOS");
          setFilterPaymentMethod("TODOS");
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
        Cerrar
      </Button>
    );

    return (
      <Modal
        isOpen={isDetailModalOpen}
        title="Detalles del día"
        onClose={() => {
          setIsDetailModalOpen(false);
          setFilterType("TODOS");
          setFilterPaymentMethod("TODOS");
        }}
        buttons={modalButtons}
        bgColor="bg-white dark:bg-gray_b"
      >
        <Box mb={2} sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Card
              sx={{
                bgcolor: "success.main",
                color: "white",
                "& .MuiTypography-root": {
                  color: "white !important",
                },
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Total Ingresos
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(totalIngresos)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Card
              sx={{
                bgcolor: "error.main",
                color: "white",
                "& .MuiTypography-root": {
                  color: "white !important",
                },
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Total Egresos
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(totalEgresos)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Box mb={2} sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth size="small">
              <Select
                label="Tipo"
                value={filterType}
                options={[
                  { value: "TODOS", label: "Todos" },
                  { value: "INGRESO", label: "Ingreso" },
                  { value: "EGRESO", label: "Egreso" },
                ]}
                onChange={(value) =>
                  setFilterType(value as "TODOS" | "INGRESO" | "EGRESO")
                }
              />
            </FormControl>
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth size="small">
              <Select
                label="Método de Pago"
                value={filterPaymentMethod}
                options={[
                  { value: "TODOS", label: "Todos" },
                  ...paymentOptions,
                ]}
                onChange={(value) =>
                  setFilterPaymentMethod(value as PaymentMethod | "TODOS")
                }
              />
            </FormControl>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: "61vh" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                  Tipo
                </TableCell>
                <TableCell
                  sx={{ bgcolor: "primary.main", color: "white" }}
                  align="center"
                >
                  Producto
                </TableCell>
                <TableCell
                  sx={{ bgcolor: "primary.main", color: "white" }}
                  align="center"
                >
                  Descripción
                </TableCell>
                <TableCell
                  sx={{ bgcolor: "primary.main", color: "white" }}
                  align="center"
                >
                  Métodos de Pago
                </TableCell>
                <TableCell
                  sx={{ bgcolor: "primary.main", color: "white" }}
                  align="center"
                >
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(groupedMovements).length > 0 ? (
                Object.values(groupedMovements).map((movement, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Chip
                        label={movement.type}
                        color={
                          movement.type === "INGRESO" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {movement.items && movement.items.length > 0 ? (
                        <Box>
                          {movement.items.map((item, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography variant="body2">
                                {getDisplayProductName(
                                  {
                                    name: item.productName,
                                    size: item.size,
                                    color: item.color,
                                    rubro: rubro,
                                  },
                                  rubro,
                                  true
                                )}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ minWidth: "5rem" }}
                              >
                                ×{item.quantity} {item.unit}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : movement.productName ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {getDisplayProductName(
                              {
                                name: movement.productName,
                                size: movement.size,
                                color: movement.color,
                                rubro: rubro,
                              },
                              rubro,
                              true
                            )}
                          </Typography>
                          <Typography variant="body2">
                            ×{movement.quantity} {movement.unit}
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{movement.description}</TableCell>
                    <TableCell>
                      {movement.isBudgetGroup ? (
                        <Box>
                          {movement.subMovements?.map((sub, i) => (
                            <Box key={i}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ textTransform: "uppercase" }}
                                >
                                  {sub.isDeposit ? "SEÑA" : "VENTA"}
                                </Typography>
                                <Typography variant="body2">
                                  {sub.paymentMethod}:{" "}
                                  {formatCurrency(sub.amount)}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ) : movement.combinedPaymentMethods ? (
                        <Box>
                          {movement.combinedPaymentMethods.map((method, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography variant="body2">
                                {method.method}:
                              </Typography>
                              <Typography variant="body2">
                                {formatCurrency(method.amount)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">
                            {movement.paymentMethod}
                          </Typography>
                          <Typography variant="body2">
                            {formatCurrency(movement.amount)}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          movement.type === "INGRESO"
                            ? "success.main"
                            : "error.main"
                        }
                      >
                        {formatCurrency(movement.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      No hay movimientos que coincidan con los filtros
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Modal>
    );
  }, [
    isDetailModalOpen,
    getFilteredMovements,
    calculateFilteredTotals,
    filterType,
    filterPaymentMethod,
    rubro,
  ]);

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
          Caja Diaria
        </Typography>

        {/* Estado actual de caja */}
        {currentDailyCash ? (
          <Card
            sx={{
              mb: 2,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? currentDailyCash.closed
                    ? "linear-gradient(135deg, #7f1d1d, #450a0a)"
                    : "linear-gradient(135deg, #065f46, #064e3b)"
                  : currentDailyCash.closed
                  ? "linear-gradient(135deg, #f56565, #c53030)"
                  : "linear-gradient(135deg, #48bb78, #2f855a)",
              color: "white",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {currentDailyCash.closed ? "Caja Cerrada" : "Caja Abierta"}
                </Typography>
                <Typography variant="body1" sx={{ marginTop: "3px" }}>
                  {format(parseISO(currentDailyCash.date), "dd/MM/yyyy")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ mb: 2, p: 2 }}>
            <Typography variant="body1" color="text.secondary">
              No hay caja abierta para hoy
            </Typography>
          </Card>
        )}

        {/* Header con filtros y acciones */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Mes"
                value={selectedMonth}
                options={monthOptions}
                onChange={(value) => setSelectedMonth(value as number)}
              />
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Año"
                value={selectedYear}
                options={yearOptions}
                onChange={(value) => setSelectedYear(value as number)}
              />
            </FormControl>
          </Box>

          {rubro !== "Todos los rubros" && (
            <Box>
              {currentDailyCash ? (
                currentDailyCash.closed ? (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={openCash}
                    sx={{
                      bgcolor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    Reabrir Caja
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Close />}
                    onClick={closeCash}
                    sx={{
                      bgcolor: "error.main",
                      "&:hover": { bgcolor: "error.dark" },
                    }}
                  >
                    Cerrar Caja
                  </Button>
                )
              ) : (
                <Button
                  variant="contained"
                  onClick={openCash}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  Abrir Caja
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Tabla de caja diaria */}
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
              sx={{ maxHeight: "61vh", flex: 1 }}
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
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ingresos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Egresos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ganancia
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Estado de caja
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((day, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography fontWeight="bold">
                            {format(parseISO(day.date), "dd/MM/yyyy")}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="success.main">
                            {formatCurrency(day.ingresos)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="error.main">
                            {formatCurrency(day.egresos)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="profit.main">
                            {formatCurrency(day.gananciaNeta || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={day.closed ? "Cerrada" : "Abierta"}
                            color={day.closed ? "error" : "success"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => openDetailModal(day.movements)}
                            size="small"
                            sx={{
                              borderRadius: "4px",
                              color: "text.secondary",
                              "&:hover": {
                                backgroundColor: "primary.main",
                                color: "white",
                              },
                            }}
                            title="Ver detalles"
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <PointOfSale
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>
                            No hay registros para el período seleccionado.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {dailySummaries.length > 0 && (
            <Pagination
              text="Días por página"
              text2="Total de días"
              totalItems={dailySummaries.length}
            />
          )}
        </Box>

        <DetailModal />

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={closeNotification}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default CajaDiariaPage;

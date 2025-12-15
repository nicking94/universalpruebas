"use client";
import { useState, useEffect } from "react";
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
  Card,
  FormControl,
  Alert,
  useTheme,
  IconButton,
  Autocomplete,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Warning,
  CheckCircle,
  Info,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { useCreditInstallments } from "@/app/hooks/useCreditInstallments";
import { useNotification } from "@/app/hooks/useNotification";
import { usePagination } from "@/app/context/PaginationContext";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  Payment,
  DailyCashMovement,
  Rubro,
} from "@/app/lib/types/types";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Pagination from "@/app/components/Pagination";
import CustomChip from "@/app/components/CustomChip";
import { useRubro } from "@/app/context/RubroContext";
import { CustomerFinancialSummary } from "@/app/components/CustomerFinancialSummary";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import Input from "@/app/components/Input";

// Interface para el resumen por cliente
interface CustomerCreditSummary {
  customerId: string;
  customerName: string;
  totalCreditAmount: number;
  totalPaidAmount: number;
  pendingAmount: number;
  totalInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  paidInstallments: number;
  lastPaymentDate?: string | null;
  nextDueDate?: string | null;
  installments: Installment[];
  creditSales: CreditSale[];
}

// Interfaz para las opciones del autocomplete
interface CustomerOption {
  id: string;
  name: string;
  rubro?: Rubro;
}

const CreditosPage = () => {
  const theme = useTheme();
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [inputValue, setInputValue] = useState("");

  // Nuevos estados
  const [customerSummaries, setCustomerSummaries] = useState<
    CustomerCreditSummary[]
  >([]);
  const [selectedCustomerSummary, setSelectedCustomerSummary] =
    useState<CustomerCreditSummary | null>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] =
    useState<CustomerOption | null>(null);
  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);

  const {
    overdueInstallments,
    fetchInstallments,
    payInstallment,
    checkOverdueInstallments,
    getCreditSalesInInstallments,
  } = useCreditInstallments();

  const { currentPage, itemsPerPage } = usePagination();
  const { showNotification } = useNotification();
  const { rubro } = useRubro();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const tableHeaderStyle = {
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  };

  const calculateCustomerSummaries = async (): Promise<
    CustomerCreditSummary[]
  > => {
    try {
      const creditSales = await getCreditSalesInInstallments();
      const customerMap = new Map<string, CustomerCreditSummary>();

      for (const sale of creditSales) {
        const customerKey = sale.customerId || sale.customerName;

        if (!customerKey || !sale.customerName) continue;

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            customerId: sale.customerId || customerKey,
            customerName: sale.customerName,
            totalCreditAmount: 0,
            totalPaidAmount: 0,
            pendingAmount: 0,
            totalInstallments: 0,
            pendingInstallments: 0,
            overdueInstallments: 0,
            paidInstallments: 0,
            installments: [],
            creditSales: [],
            lastPaymentDate: null,
            nextDueDate: null,
          });
        }

        const summary = customerMap.get(customerKey)!;
        summary.creditSales.push(sale);
        summary.totalCreditAmount += sale.total;

        // Obtener cuotas de esta venta
        const saleInstallments = await db.installments
          .where("creditSaleId")
          .equals(sale.id)
          .toArray();

        summary.installments.push(...saleInstallments);

        // Calcular estadísticas de cuotas
        let hasPendingInstallments = false;
        let earliestDueDate: string | null = null;

        saleInstallments.forEach((installment) => {
          summary.totalInstallments++;

          if (installment.status === "pagada") {
            summary.paidInstallments++;

            // Sumar el monto TOTAL pagado (incluye intereses si los hubo)
            const totalPaid =
              installment.amount +
              (installment.interestAmount || 0) +
              (installment.penaltyAmount || 0);
            summary.totalPaidAmount += totalPaid;

            // Actualizar última fecha de pago
            if (installment.paymentDate) {
              const paymentDate = new Date(installment.paymentDate);
              if (
                !summary.lastPaymentDate ||
                paymentDate > new Date(summary.lastPaymentDate)
              ) {
                summary.lastPaymentDate = installment.paymentDate;
              }
            }
          } else if (
            installment.status === "pendiente" ||
            installment.status === "vencida"
          ) {
            if (installment.status === "vencida") {
              summary.overdueInstallments++;
            }

            summary.pendingInstallments++;
            hasPendingInstallments = true;

            if (!earliestDueDate || installment.dueDate < earliestDueDate) {
              earliestDueDate = installment.dueDate;
            }
          }
        });

        // Actualizar próximo vencimiento si hay cuotas pendientes/vencidas
        if (hasPendingInstallments && earliestDueDate) {
          summary.nextDueDate = earliestDueDate;
        }
      }

      // Calcular montos pendientes CORRECTAMENTE
      for (const summary of customerMap.values()) {
        // Calcular el monto TOTAL que debería pagar (suma de todas las cuotas)
        const totalDueAmount = summary.installments.reduce(
          (total, installment) => {
            return (
              total +
              installment.amount +
              (installment.interestAmount || 0) +
              (installment.penaltyAmount || 0)
            );
          },
          0
        );

        // El pendiente es lo que falta pagar del total debido
        summary.pendingAmount = Math.max(
          0,
          totalDueAmount - summary.totalPaidAmount
        );

        // Si ya pagó todo, asegurarnos que sea 0
        if (summary.pendingInstallments === 0) {
          summary.pendingAmount = 0;
        }
      }

      return Array.from(customerMap.values());
    } catch (error) {
      console.error("Error calculando resúmenes por cliente:", error);
      return [];
    }
  };

  // Cargar pagos del cliente
  const loadCustomerPayments = async (customerId: string) => {
    try {
      const payments = await db.payments
        .where("customerId")
        .equals(customerId)
        .toArray();
      setCustomerPayments(payments);
    } catch (error) {
      console.error("Error cargando pagos del cliente:", error);
      setCustomerPayments([]);
    }
  };

  const addPaymentToDailyCash = async (movement: DailyCashMovement) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      // VERIFICAR SI EL MOVIMIENTO YA EXISTE
      if (dailyCash) {
        const existingMovement = dailyCash.movements.find(
          (m) =>
            m.description === movement.description &&
            m.amount === movement.amount &&
            m.customerId === movement.customerId &&
            m.createdAt &&
            movement.createdAt &&
            Math.abs(
              new Date(m.createdAt).getTime() -
                new Date(movement.createdAt).getTime()
            ) < 60000 // Menos de 1 minuto de diferencia
        );

        if (existingMovement) {
          console.log("Movimiento ya existe, evitando duplicado");
          return true; // Ya existe, no duplicar
        }
      }

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: movement.amount,
          totalExpense: 0,
          totalProfit: 0,
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const currentMovements = dailyCash.movements || [];
        const updatedMovements = [...currentMovements, movement];

        const totalIncome = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const totalExpense = updatedMovements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const totalProfit = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + (m.profit || 0), 0);

        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          totalIncome,
          totalExpense,
          totalProfit,
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }

      return true;
    } catch (error) {
      console.error("Error al registrar pago en caja:", error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchInstallments();
      await checkOverdueInstallments();

      // ✅ Obtener clientes directamente de las ventas a crédito en cuotas
      const sales = await getCreditSalesInInstallments();

      // Crear lista única de clientes desde las ventas
      const customerMap = new Map<string, CustomerOption>();
      sales.forEach((sale) => {
        if (sale.customerName && !customerMap.has(sale.customerName)) {
          customerMap.set(sale.customerName, {
            id: sale.customerId || `temp-${sale.customerName}`,
            name: sale.customerName,
          });
        }
      });

      const allCustomers = Array.from(customerMap.values());

      // Aplicar filtro de rubro si es necesario
      const filteredCustomers = await applyRubroFilter(
        allCustomers,
        sales,
        rubro
      );

      setCustomers(filteredCustomers);
      setCreditSales(sales);

      // Calcular resúmenes por cliente
      const summaries = await calculateCustomerSummaries();
      setCustomerSummaries(summaries);

      console.log("Clientes cargados para autocomplete:", filteredCustomers);
      console.log("Ventas de crédito encontradas:", sales.length);
      console.log("Resúmenes calculados:", summaries.length);
    };

    loadData();

    const interval = setInterval(checkOverdueInstallments, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [
    fetchInstallments,
    checkOverdueInstallments,
    rubro,
    getCreditSalesInInstallments,
  ]);

  // Función auxiliar para aplicar filtro de rubro
  const applyRubroFilter = async (
    customers: CustomerOption[],
    sales: CreditSale[],
    currentRubro: Rubro
  ): Promise<CustomerOption[]> => {
    if (currentRubro === "Todos los rubros") {
      return customers;
    }

    // Filtrar clientes cuyas ventas tengan productos del rubro
    const filteredCustomers = customers.filter((customer) => {
      // Encontrar las ventas de este cliente
      const customerSales = sales.filter(
        (sale) => sale.customerName === customer.name
      );

      // Verificar si alguna venta tiene productos del rubro
      return customerSales.some((sale) =>
        sale.products?.some((product) => product.rubro === currentRubro)
      );
    });

    return filteredCustomers;
  };

  const paymentMethodOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "pendiente", label: "Pendientes" },
    { value: "pagada", label: "Pagadas" },
    { value: "vencida", label: "Vencidas" },
  ];

  // Crear opciones para el autocomplete de clientes
  const customerOptions = [
    { id: "", name: "Todos los clientes" },
    ...customers,
  ];

  // Reemplaza la función handlePayInstallment actual con esta versión corregida:
  const handlePayInstallment = async () => {
    if (!selectedInstallment) return;

    try {
      // 1. Obtener la venta a crédito correspondiente
      const creditSale = creditSales.find(
        (s) => s.id === selectedInstallment.creditSaleId
      );

      if (!creditSale) {
        showNotification("No se encontró la venta a crédito", "error");
        return;
      }

      // 2. Crear el movimiento de caja ANTES de pagar la cuota
      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: selectedInstallment.amount,
        description: `Pago cuota #${selectedInstallment.number} - ${creditSale.customerName}`,
        type: "INGRESO",
        date: new Date().toISOString(),
        paymentMethod,
        isCreditPayment: true,
        originalSaleId: creditSale.id,
        customerName: creditSale.customerName,
        customerId: creditSale.customerId,
        profit: 0,
        createdAt: new Date().toISOString(),
      };

      // 3. Registrar el pago en la caja diaria (esta función ahora no duplica)
      await addPaymentToDailyCash(movement);

      // 4. Pagar la cuota (esto ya no debería crear otro movimiento)
      await payInstallment(selectedInstallment.id!, paymentMethod);

      // 5. Actualizar el saldo pendiente del cliente
      if (creditSale.customerId) {
        const customer = await db.customers.get(creditSale.customerId);
        if (customer) {
          const newPendingBalance = Math.max(
            0,
            (customer.pendingBalance || 0) - selectedInstallment.amount
          );

          await db.customers.update(creditSale.customerId, {
            pendingBalance: newPendingBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      showNotification("Cuota pagada correctamente", "success");
      setPaymentModalOpen(false);

      // 6. Recargar datos
      await fetchInstallments();
      await checkOverdueInstallments();

      // 7. Recalcular resúmenes
      const summaries = await calculateCustomerSummaries();
      setCustomerSummaries(summaries);
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      showNotification("Error al pagar la cuota", "error");
    }
  };

  // Filtrar resúmenes de clientes
  const filteredCustomerSummaries = customerSummaries.filter((summary) => {
    if (filterStatus !== "todos") {
      if (filterStatus === "pendiente" && summary.pendingInstallments === 0)
        return false;
      if (filterStatus === "vencida" && summary.overdueInstallments === 0)
        return false;
      if (filterStatus === "pagada" && summary.paidInstallments === 0)
        return false;
    }

    if (filterCustomer) {
      // Si se seleccionó un cliente específico
      if (summary.customerId !== filterCustomer) {
        return false;
      }
    }

    // Filtrar por rubro
    if (rubro !== "Todos los rubros") {
      const hasRubroProduct = summary.creditSales.some((sale) =>
        sale.products?.some((product) => product.rubro === rubro)
      );
      if (!hasRubroProduct) return false;
    }

    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomerSummaries.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pagada":
        return "success";
      case "pendiente":
        return "warning";
      case "vencida":
        return "error";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "dd/MM/yyyy");
  };

  const handleOpenCustomerDetail = async (summary: CustomerCreditSummary) => {
    setSelectedCustomerSummary(summary);
    await loadCustomerPayments(summary.customerId);
    setCustomerDetailModalOpen(true);
  };

  const handleCloseCustomerDetail = () => {
    setCustomerDetailModalOpen(false);
    setSelectedCustomerSummary(null);
    setCustomerPayments([]);
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Créditos
        </Typography>

        {/* Alertas de cuotas vencidas */}
        {overdueInstallments.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">
              <Warning sx={{ mr: 1 }} />
              Tienes {overdueInstallments.length} cuotas vencidas
            </Typography>
            {overdueInstallments.slice(0, 3).map((installment) => (
              <Typography key={installment.id} variant="body2">
                • Cliente:{" "}
                {creditSales.find((s) => s.id === installment.creditSaleId)
                  ?.customerName || "N/A"}{" "}
                - Cuota {installment.number} - Vencida hace{" "}
                {installment.daysOverdue} días
              </Typography>
            ))}
          </Alert>
        )}

        {/* Filtros y acciones */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as string)}
              label="Estado"
              options={statusOptions}
            />
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Autocomplete
              freeSolo
              value={selectedCustomerOption}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  // El usuario escribió algo
                  const newOption: CustomerOption = {
                    id: `custom-${Date.now()}`,
                    name: newValue,
                  };
                  setSelectedCustomerOption(newOption);
                  setFilterCustomer(newOption.id);
                  setInputValue(newValue);
                } else if (newValue && typeof newValue === "object") {
                  // El usuario seleccionó una opción existente
                  setSelectedCustomerOption(newValue);
                  setFilterCustomer(newValue.id);
                  setInputValue(newValue.name);
                } else {
                  // Se limpió la selección
                  setSelectedCustomerOption(null);
                  setFilterCustomer("");
                  setInputValue("");
                }
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
                // Si se limpia el input, también limpiar el filtro
                if (newInputValue === "") {
                  setFilterCustomer("");
                }
              }}
              options={customerOptions}
              getOptionLabel={(option) => {
                if (typeof option === "string") {
                  return option;
                }
                return option.name || "";
              }}
              renderInput={(params) => (
                <Input
                  {...params}
                  label="Buscar cliente"
                  placeholder="Selecciona o escribe un nombre"
                  fullWidth
                  size="small"
                />
              )}
              filterOptions={(options, { inputValue }) => {
                const filtered = options.filter((option) =>
                  option.name.toLowerCase().includes(inputValue.toLowerCase())
                );

                // Si el usuario escribe algo que no está en las opciones,
                // crear un objeto CustomerOption temporal
                if (
                  inputValue !== "" &&
                  !filtered.some((option) => option.name === inputValue)
                ) {
                  const customOption: CustomerOption = {
                    id: `custom-${Date.now()}`,
                    name: inputValue,
                  };
                  return [customOption, ...filtered];
                }

                return filtered;
              }}
            />
          </FormControl>
        </Box>

        {/* Tabla de clientes con créditos */}
        <Box sx={{ flex: 1, minHeight: "auto" }}>
          <TableContainer component={Paper} sx={{ maxHeight: "60vh", flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderStyle}>Cliente</TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Monto Total Crédito
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Pagado
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Pendiente
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Próximo Vencimiento
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Estado
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Cuotas
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentItems.map((summary) => {
                  return (
                    <TableRow
                      key={summary.customerId}
                      hover
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": { backgroundColor: "action.hover" },
                        transition: "all 0.3s",
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {summary.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {summary.creditSales.length} venta(s)
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(summary.totalCreditAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={"bold"}
                        >
                          {formatCurrency(summary.totalPaidAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={
                            summary.pendingAmount > 0
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {summary.pendingAmount <= 0
                            ? formatCurrency(0)
                            : formatCurrency(summary.pendingAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          {summary.nextDueDate ? (
                            <Typography variant="body2">
                              {formatDate(summary.nextDueDate)}
                            </Typography>
                          ) : summary.pendingInstallments === 0 ? (
                            <CustomChip
                              label="Al día"
                              color="success"
                              size="small"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin fecha
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <CustomChip
                          label={
                            summary.overdueInstallments > 0
                              ? "Con vencimientos"
                              : summary.pendingInstallments > 0
                              ? "Pendiente"
                              : "Al día"
                          }
                          color={
                            summary.overdueInstallments > 0
                              ? "error"
                              : summary.pendingInstallments > 0
                              ? "warning"
                              : "success"
                          }
                          size="small"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Typography variant="body2">
                            {summary.totalInstallments}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <CustomGlobalTooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenCustomerDetail(summary)}
                              sx={{
                                borderRadius: "4px",
                                color: "text.secondary",
                                "&:hover": {
                                  backgroundColor: "primary.main",
                                  color: "white",
                                },
                              }}
                            >
                              <Info fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {filteredCustomerSummaries.length > 0 && (
          <Pagination
            text="Créditos por página"
            text2="Total de clientes con créditos"
            totalItems={filteredCustomerSummaries.length}
          />
        )}

        {/* Modal de pago de cuota */}
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`Pagar Cuota ${selectedInstallment?.number}`}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                onClick={() => setPaymentModalOpen(false)}
                variant="text"
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
              <Button
                variant="contained"
                onClick={handlePayInstallment}
                startIcon={<CheckCircle />}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Confirmar Pago
              </Button>
            </Box>
          }
        >
          {selectedInstallment && (
            <Box>
              <Typography gutterBottom variant="body1">
                Cliente:{" "}
                <strong>
                  {
                    creditSales.find(
                      (s) => s.id === selectedInstallment.creditSaleId
                    )?.customerName
                  }
                </strong>
              </Typography>
              <Typography gutterBottom variant="body1">
                Monto total:{" "}
                <strong>{formatCurrency(selectedInstallment.amount)}</strong>
              </Typography>
              <Typography gutterBottom variant="body1">
                Interés:{" "}
                <strong>
                  {selectedInstallment.interestAmount > 0 && (
                    <Typography gutterBottom variant="body1">
                      Interés:{" "}
                      <strong>
                        {formatCurrency(selectedInstallment.interestAmount)}
                      </strong>
                    </Typography>
                  )}
                </strong>
              </Typography>
              {selectedInstallment.penaltyAmount > 0 && (
                <Typography gutterBottom variant="body1" color="error">
                  Penalización:{" "}
                  <strong>
                    {formatCurrency(selectedInstallment.penaltyAmount)}
                  </strong>
                </Typography>
              )}

              <FormControl fullWidth sx={{ mt: 3 }}>
                <Select
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  label="Método de pago"
                  options={paymentMethodOptions}
                />
              </FormControl>
            </Box>
          )}
        </Modal>

        {/* Modal de detalle del cliente - Reemplazado por tu componente Modal */}
        <Modal
          isOpen={customerDetailModalOpen}
          onClose={handleCloseCustomerDetail}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">
                Detalle del Cliente - {selectedCustomerSummary?.customerName}
              </Typography>
            </Box>
          }
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              onClick={handleCloseCustomerDetail}
              variant="text"
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
          {selectedCustomerSummary && (
            <Box sx={{ maxHeight: "70vh", overflow: "auto" }}>
              {/* Resumen financiero */}
              <CustomerFinancialSummary
                customerInfo={{
                  name: selectedCustomerSummary.customerName,
                  balance: selectedCustomerSummary.pendingAmount,
                  sales: selectedCustomerSummary.creditSales,
                }}
                payments={customerPayments}
              />

              {/* Detalle de cuotas */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Cuotas del Cliente
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: "300px" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Venta</TableCell>
                        <TableCell align="center">N° Cuota</TableCell>
                        <TableCell align="center">Vencimiento</TableCell>
                        <TableCell align="center">Monto</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCustomerSummary.installments.map(
                        (installment) => {
                          const sale = creditSales.find(
                            (s) => s.id === installment.creditSaleId
                          );
                          const saleNumber = sale ? `Venta #${sale.id}` : "N/A";
                          const isOverdue = installment.status === "vencida";
                          const isPending = installment.status === "pendiente";

                          return (
                            <TableRow key={installment.id}>
                              <TableCell>
                                <Typography variant="body2" fontSize="0.75rem">
                                  {saleNumber}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {installment.number}
                              </TableCell>
                              <TableCell align="center">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  {formatDate(installment.dueDate)}
                                  {isOverdue && (
                                    <CustomChip
                                      label={`+${installment.daysOverdue}d`}
                                      size="small"
                                      color="error"
                                      sx={{
                                        height: 20,
                                        fontSize: "0.7rem",
                                      }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {formatCurrency(installment.amount)}
                              </TableCell>
                              <TableCell align="center">
                                <CustomChip
                                  label={installment.status}
                                  color={getStatusColor(installment.status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {isPending || isOverdue ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<PaymentIcon fontSize="small" />}
                                    onClick={() => {
                                      setSelectedInstallment(installment);
                                      setPaymentModalOpen(true);
                                      handleCloseCustomerDetail();
                                    }}
                                  >
                                    Pagar
                                  </Button>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    Pagada:{" "}
                                    {formatDate(installment.paymentDate)}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Historial de ventas */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Historial de Ventas a Crédito
                </Typography>
                {selectedCustomerSummary.creditSales.map((sale) => (
                  <Card key={sale.id} sx={{ mb: 2, p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Venta #{sale.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(sale.date)}
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(sale.total)}
                      </Typography>
                    </Box>
                    {sale.products && (
                      <Typography variant="caption" color="text.secondary">
                        Productos: {sale.products.map((p) => p.name).join(", ")}
                      </Typography>
                    )}
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </Modal>

        {/* Modal de reporte */}
        <Modal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title="Reporte de Créditos"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => setReportModalOpen(false)}
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
        ></Modal>
      </Box>
    </ProtectedRoute>
  );
};

export default CreditosPage;

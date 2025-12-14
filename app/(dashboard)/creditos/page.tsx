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
  TextField,
  FormControl,
  InputLabel,
  Alert,
  Autocomplete,
  useTheme,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  CalendarToday,
  Warning,
  CheckCircle,
  History,
  TrendingUp,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { useCreditInstallments } from "@/app/hooks/useCreditInstallments";
import { useNotification } from "@/app/hooks/useNotification";
import { usePagination } from "@/app/context/PaginationContext";
import { db } from "@/app/database/db";
import { Installment, CreditSale, PaymentMethod } from "@/app/lib/types/types";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Pagination from "@/app/components/Pagination";
import CustomChip from "@/app/components/CustomChip";
import { useRubro } from "@/app/context/RubroContext";

// Definir tipo para el reporte
interface CreditReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalCreditSales: number;
  totalAmount: number;
  installmentsByStatus: {
    pendiente: number;
    pagada: number;
    vencida: number;
  };
  totalInterest: number;
  totalPenalties: number;
  overdueInstallments: Installment[];
}

const CreditosPage = () => {
  const theme = useTheme();
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterCreditType, setFilterCreditType] = useState<string>("todos");

  const {
    installments,
    overdueInstallments,
    fetchInstallments,
    payInstallment,
    checkOverdueInstallments,
    generateCreditReport,
  } = useCreditInstallments();

  const { currentPage, itemsPerPage } = usePagination();
  const { showNotification } = useNotification();
  const { rubro } = useRubro();

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    []
  );
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [report, setReport] = useState<CreditReport | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const tableHeaderStyle = {
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  };

  const getCardStyle = (
    color: "success" | "error" | "primary" | "warning"
  ) => ({
    bgcolor: theme.palette.mode === "dark" ? `${color}.dark` : `${color}.main`,
    color: "white",
    "& .MuiTypography-root": {
      color: "white !important",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchInstallments();
      await checkOverdueInstallments();

      // Cargar clientes filtrados por rubro
      const allCustomers = await db.customers.toArray();
      const filteredCustomers =
        rubro === "Todos los rubros"
          ? allCustomers
          : allCustomers.filter((c) => c.rubro === rubro);

      setCustomers(filteredCustomers.map((c) => ({ id: c.id, name: c.name })));

      const sales = (await db.sales
        .where("credit")
        .equals(1)
        .toArray()) as CreditSale[];

      const filteredSales =
        rubro === "Todos los rubros"
          ? sales
          : sales.filter((sale) =>
              sale.products?.some((product) => product.rubro === rubro)
            );

      setCreditSales(filteredSales);
    };

    loadData();

    // Verificar vencimientos cada día
    const interval = setInterval(checkOverdueInstallments, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchInstallments, checkOverdueInstallments, rubro]);

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
  const creditTypeOptions = [
    { value: "todos", label: "Todos los créditos" },
    { value: "credito_cuotas", label: "Créditos en cuotas" },
    { value: "cuenta_corriente", label: "Cuentas corrientes" },
  ];

  const handlePayInstallment = async () => {
    if (!selectedInstallment) return;

    try {
      await payInstallment(selectedInstallment.id!, paymentMethod);
      showNotification("Cuota pagada correctamente", "success");
      setPaymentModalOpen(false);
      await fetchInstallments();
      await checkOverdueInstallments();
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      showNotification("Error al pagar la cuota", "error");
    }
  };

  const handleGenerateReport = async () => {
    const startDate = format(new Date().setDate(1), "yyyy-MM-dd");
    const endDate = format(new Date(), "yyyy-MM-dd");

    const reportData = await generateCreditReport(startDate, endDate);
    setReport(reportData);
    setReportModalOpen(true);
  };

  const filteredInstallments = installments.filter((installment) => {
    if (filterStatus !== "todos" && installment.status !== filterStatus)
      return false;

    if (filterCustomer) {
      const sale = creditSales.find((s) => s.id === installment.creditSaleId);
      if (
        !sale ||
        !sale.customerName?.toLowerCase().includes(filterCustomer.toLowerCase())
      )
        return false;
    }

    // Filtrar por rubro
    const sale = creditSales.find((s) => s.id === installment.creditSaleId);
    if (rubro !== "Todos los rubros" && sale) {
      const hasRubroProduct = sale.products?.some(
        (product) => product.rubro === rubro
      );
      if (!hasRubroProduct) return false;
    }
    if (filterCreditType !== "todos") {
      const sale = creditSales.find((s) => s.id === installment.creditSaleId);
      if (!sale || sale.creditType !== filterCreditType) return false;
    }

    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInstallments.slice(
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
          Gestión de Créditos en Cuotas
        </Typography>

        {/* Resumen */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            mb: 4,
            "& > *": {
              flex: "1 1 calc(25% - 24px)",
              minWidth: "200px",
            },
          }}
        >
          <Card sx={{ p: 2, textAlign: "center", ...getCardStyle("primary") }}>
            <Typography variant="h6">Total Cuotas</Typography>
            <Typography variant="h4">{installments.length}</Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: "center", ...getCardStyle("warning") }}>
            <Typography variant="h6">Pendientes</Typography>
            <Typography variant="h4">
              {installments.filter((i) => i.status === "pendiente").length}
            </Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: "center", ...getCardStyle("error") }}>
            <Typography variant="h6">Vencidas</Typography>
            <Typography variant="h4">
              {installments.filter((i) => i.status === "vencida").length}
            </Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: "center", ...getCardStyle("success") }}>
            <Typography variant="h6">Pagadas</Typography>
            <Typography variant="h4">
              {installments.filter((i) => i.status === "pagada").length}
            </Typography>
          </Card>
        </Box>

        {/* Alertas de cuotas vencidas */}
        {overdueInstallments.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">
              <Warning sx={{ mr: 1 }} />
              Tienes {overdueInstallments.length} cuotas vencidas
            </Typography>
            {overdueInstallments.slice(0, 3).map((installment) => (
              <Typography key={installment.id} variant="body2">
                • Cuota {installment.number} - Vencida hace{" "}
                {installment.daysOverdue} días
              </Typography>
            ))}
          </Alert>
        )}

        {/* Filtros y acciones */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as string)}
              label="Estado"
              options={statusOptions}
            />
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Tipo de crédito</InputLabel>
            <Select
              value={filterCreditType}
              onChange={(value) => setFilterCreditType(value as string)}
              label="Tipo de crédito"
              options={creditTypeOptions}
            />
          </FormControl>

          <Autocomplete
            size="small"
            options={customers}
            getOptionLabel={(option) => option.name}
            value={customers.find((c) => c.id === filterCustomer) || null}
            onChange={(_, newValue) => setFilterCustomer(newValue?.id || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buscar cliente"
                sx={{ minWidth: 200 }}
              />
            )}
          />

          <Button
            variant="contained"
            startIcon={<TrendingUp />}
            onClick={handleGenerateReport}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Generar Reporte
          </Button>

          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={checkOverdueInstallments}
            sx={{
              borderColor: "primary.main",
              color: "primary.main",
              "&:hover": {
                backgroundColor: "primary.main",
                color: "white",
              },
            }}
          >
            Verificar Vencimientos
          </Button>
        </Box>

        {/* Tabla de cuotas */}
        <Box sx={{ flex: 1, minHeight: "auto" }}>
          <TableContainer component={Paper} sx={{ maxHeight: "60vh", flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderStyle}>Cliente</TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    N° Cuota
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Vencimiento
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Monto
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Interés
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Penalización
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Estado
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentItems.map((installment) => {
                  const sale = creditSales.find(
                    (s) => s.id === installment.creditSaleId
                  );
                  const isOverdue = installment.status === "vencida";

                  return (
                    <TableRow
                      key={installment.id}
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
                            {sale?.customerName || "N/A"}
                          </Typography>
                          {sale?.creditType === "credito_cuotas" && (
                            <CustomChip
                              label="En cuotas"
                              color="primary"
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                          {sale?.creditType === "cuenta_corriente" && (
                            <CustomChip
                              label="Cta. Cte."
                              color="secondary"
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {installment.number}
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
                          <CalendarToday fontSize="small" />
                          <Typography variant="body2">
                            {format(
                              parseISO(installment.dueDate),
                              "dd/MM/yyyy"
                            )}
                          </Typography>
                          {isOverdue && (
                            <CustomChip
                              label={`+${installment.daysOverdue}d`}
                              size="small"
                              color="error"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(installment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="warning.main">
                          {formatCurrency(installment.interestAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error.main">
                          {formatCurrency(installment.penaltyAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <CustomChip
                          label={installment.status}
                          color={getStatusColor(installment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {installment.status === "pendiente" ||
                        installment.status === "vencida" ? (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PaymentIcon />}
                            onClick={() => {
                              setSelectedInstallment(installment);
                              setPaymentModalOpen(true);
                            }}
                            sx={{
                              bgcolor: "primary.main",
                              "&:hover": { bgcolor: "primary.dark" },
                            }}
                          >
                            Pagar
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            Pagada:{" "}
                            {installment.paymentDate &&
                              format(
                                parseISO(installment.paymentDate),
                                "dd/MM/yyyy"
                              )}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {filteredInstallments.length > 0 && (
          <Pagination
            text="Cuotas por página"
            text2="Total de cuotas"
            totalItems={filteredInstallments.length}
          />
        )}

        {/* Modal de pago */}
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`Pagar Cuota ${selectedInstallment?.number}`}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                onClick={() => setPaymentModalOpen(false)}
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
                  {formatCurrency(selectedInstallment.interestAmount)}
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
                <InputLabel>Método de pago</InputLabel>
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
        >
          {report && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Periodo:{" "}
                {format(parseISO(report.period.startDate), "dd/MM/yyyy", {
                  locale: es,
                })}{" "}
                -{" "}
                {format(parseISO(report.period.endDate), "dd/MM/yyyy", {
                  locale: es,
                })}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  mt: 2,
                  "& > *": {
                    flex: "1 1 calc(50% - 12px)",
                    minWidth: "250px",
                  },
                }}
              >
                <Card sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle1">Ventas a crédito</Typography>
                  <Typography variant="h4">
                    {report.totalCreditSales}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle1">Monto total</Typography>
                  <Typography variant="h4">
                    {formatCurrency(report.totalAmount)}
                  </Typography>
                </Card>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Estado de cuotas
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <CustomChip
                    label={`Pendientes: ${report.installmentsByStatus.pendiente}`}
                    color="warning"
                  />
                  <CustomChip
                    label={`Pagadas: ${report.installmentsByStatus.pagada}`}
                    color="success"
                  />
                  <CustomChip
                    label={`Vencidas: ${report.installmentsByStatus.vencida}`}
                    color="error"
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  mt: 2,
                  "& > *": {
                    flex: "1 1 calc(50% - 12px)",
                    minWidth: "250px",
                  },
                }}
              >
                <Card sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle1">
                    Intereses cobrados
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(report.totalInterest)}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle1">Penalizaciones</Typography>
                  <Typography variant="h4" color="error.main">
                    {formatCurrency(report.totalPenalties)}
                  </Typography>
                </Card>
              </Box>

              {report.overdueInstallments.length > 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  <Typography variant="h6">Cuotas vencidas</Typography>
                  {report.overdueInstallments
                    .slice(0, 5)
                    .map((installment: Installment) => (
                      <Typography key={installment.id} variant="body2">
                        • Cuota {installment.number} -{" "}
                        {formatCurrency(installment.amount)} - Vencida el{" "}
                        {format(parseISO(installment.dueDate), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </Typography>
                    ))}
                </Alert>
              )}
            </Box>
          )}
        </Modal>
      </Box>
    </ProtectedRoute>
  );
};

export default CreditosPage;

"use client";
import { useState, useEffect, useMemo } from "react";
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
  FormControl,
  Alert,
  useTheme,
  IconButton,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Avatar,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Warning,
  CheckCircle,
  Info,
  ExpandMore,
  Receipt as ReceiptIcon,
  AccountCircle as AccountCircleIcon,
  History as HistoryIcon,
  ExpandLess,
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
import { es } from "date-fns/locale";

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
  totalInterestAmount: number;
  totalPrincipalAmount: number;
}

interface CustomerOption {
  id: string;
  name: string;
  rubro?: Rubro;
}

interface CreditSummary {
  saleId: number;
  saleDate: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  paidAmount: number;
  pendingAmount: number;
  installments: Installment[];
  nextDueDate?: string;
  status: string;
}

const CreditSaleCard = ({
  credit,
  onPayment,
  isExpanded,
  onToggleExpand,
}: {
  credit: CreditSummary;
  payments: Payment[];
  onPayment: (credit: CreditSummary) => void;
  isExpanded: boolean;
  onToggleExpand: (saleId: number) => void;
}) => {
  const paymentProgress = (credit.paidAmount / credit.totalAmount) * 100;
  const isPaid = credit.pendingAmount <= 0;

  return (
    <Card
      sx={{
        border: 2,
        borderColor: isPaid
          ? "success.main"
          : credit.status === "Vencido"
          ? "error.main"
          : "warning.main",
        bgcolor: isPaid
          ? "success.50"
          : credit.status === "Vencido"
          ? "error.50"
          : "warning.50",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)",
        },
        overflow: "visible",
        mb: 2,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
            cursor: "pointer",
          }}
          onClick={() => onToggleExpand(credit.saleId)}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <ReceiptIcon color="primary" fontSize="small" />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                Venta #{credit.saleId}
              </Typography>
              <CustomChip
                label={credit.status}
                color={
                  credit.status === "Pagado"
                    ? "success"
                    : credit.status === "Vencido"
                    ? "error"
                    : "warning"
                }
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {format(parseISO(credit.saleDate), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
                mt: 2,
                mb: 2,
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Total
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {credit.totalAmount.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Pagado
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="success.main"
                >
                  {credit.paidAmount.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Pendiente
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="warning.main"
                >
                  {credit.pendingAmount.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Tasa de interés
                </Typography>
                <Typography variant="body2">{credit.interestRate}%</Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Cuotas
                </Typography>
                <Typography variant="body2">
                  {credit.numberOfInstallments}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Interés total
                </Typography>
                <Typography variant="body2">
                  {credit.interestAmount.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </Box>
            </Box>

            {!isPaid && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={paymentProgress}
                  color={
                    paymentProgress >= 100
                      ? "success"
                      : paymentProgress >= 50
                      ? "primary"
                      : "warning"
                  }
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block", textAlign: "center" }}
                >
                  {paymentProgress.toFixed(1)}% pagado
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {!isPaid && (
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e?.stopPropagation();
                  onPayment(credit);
                }}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Pagar Cuota
              </Button>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(credit.saleId);
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {isExpanded && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
              Detalle de Cuotas
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: "200px" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                    >
                      N° Cuota
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Vencimiento
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Monto
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Interés
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Estado
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credit.installments.map((installment) => {
                    const isOverdue = installment.status === "vencida";

                    const isPaid = installment.status === "pagada";

                    return (
                      <TableRow key={installment.id} hover>
                        <TableCell>{installment.number}</TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            {format(
                              parseISO(installment.dueDate),
                              "dd/MM/yyyy"
                            )}
                            {isOverdue && (
                              <CustomChip
                                label={`+${installment.daysOverdue || 0}d`}
                                size="small"
                                color="error"
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {installment.amount.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </TableCell>
                        <TableCell align="center">
                          {(installment.interestAmount || 0).toLocaleString(
                            "es-AR",
                            {
                              style: "currency",
                              currency: "ARS",
                            }
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <CustomChip
                            label={installment.status}
                            color={
                              isPaid
                                ? "success"
                                : isOverdue
                                ? "error"
                                : "warning"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const CreditosPage = () => {
  const theme = useTheme();
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [inputValue, setInputValue] = useState("");

  const [customerSummaries, setCustomerSummaries] = useState<
    CustomerCreditSummary[]
  >([]);
  const [selectedCustomerSummary, setSelectedCustomerSummary] =
    useState<CustomerCreditSummary | null>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] =
    useState<CustomerOption | null>(null);
  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [creditSummaries, setCreditSummaries] = useState<CreditSummary[]>([]);
  const [expandedCreditId, setExpandedCreditId] = useState<number | null>(null);
  const [infoModalTab, setInfoModalTab] = useState(0);

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

  const tableHeaderStyle = {
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  };

  const calculateCreditSummaries = (
    customerSummary: CustomerCreditSummary
  ): CreditSummary[] => {
    const summaries: CreditSummary[] = [];

    customerSummary.creditSales.forEach((sale) => {
      const saleInstallments = customerSummary.installments.filter(
        (inst) => inst.creditSaleId === sale.id
      );

      const paidAmount = saleInstallments
        .filter((inst) => inst.status === "pagada")
        .reduce((sum, inst) => sum + inst.amount, 0);

      const pendingAmount = saleInstallments
        .filter(
          (inst) => inst.status === "pendiente" || inst.status === "vencida"
        )
        .reduce((sum, inst) => sum + inst.amount, 0);

      const interestAmount = saleInstallments.reduce(
        (sum, inst) => sum + (inst.interestAmount || 0),
        0
      );

      const nextDueDate = saleInstallments
        .filter(
          (inst) => inst.status === "pendiente" || inst.status === "vencida"
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )[0]?.dueDate;

      const status =
        pendingAmount === 0
          ? "Pagado"
          : saleInstallments.some((inst) => inst.status === "vencida")
          ? "Vencido"
          : "Pendiente";

      summaries.push({
        saleId: sale.id,
        saleDate: sale.date,
        totalAmount: sale.total,
        principalAmount: sale.total - interestAmount,
        interestAmount: interestAmount,
        numberOfInstallments: saleInstallments.length,
        interestRate: sale.creditDetails?.interestRate || 0,
        paidAmount: paidAmount,
        pendingAmount: pendingAmount,
        installments: saleInstallments,
        nextDueDate: nextDueDate,
        status: status,
      });
    });

    return summaries.sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
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
            totalPrincipalAmount: 0,
            totalInterestAmount: 0,
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

        const creditAmount = sale.creditDetails?.totalAmount || sale.total;
        summary.totalCreditAmount += creditAmount;

        const principalAmount =
          sale.creditDetails?.principalAmount || sale.total;
        summary.totalPrincipalAmount += principalAmount;

        const saleInstallments = await db.installments
          .where("creditSaleId")
          .equals(sale.id)
          .toArray();

        summary.installments.push(...saleInstallments);

        let hasPendingInstallments = false;
        let earliestDueDate: string | null = null;

        saleInstallments.forEach((installment) => {
          summary.totalInstallments++;

          if (installment.status === "pagada") {
            summary.paidInstallments++;
            summary.totalPaidAmount += installment.amount;
            summary.totalInterestAmount += installment.interestAmount || 0;

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

        if (hasPendingInstallments && earliestDueDate) {
          summary.nextDueDate = earliestDueDate;
        }
      }

      for (const summary of customerMap.values()) {
        summary.pendingAmount = Math.max(
          0,
          summary.totalCreditAmount - summary.totalPaidAmount
        );
      }

      return Array.from(customerMap.values());
    } catch (error) {
      console.error("Error calculando resúmenes por cliente:", error);
      return [];
    }
  };

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

  useEffect(() => {
    const loadData = async () => {
      await fetchInstallments();
      await checkOverdueInstallments();

      const sales = await getCreditSalesInInstallments();
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
      const filteredCustomers = await applyRubroFilter(
        allCustomers,
        sales,
        rubro
      );

      setCustomers(filteredCustomers);
      setCreditSales(sales);

      const summaries = await calculateCustomerSummaries();
      setCustomerSummaries(summaries);
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

  const applyRubroFilter = async (
    customers: CustomerOption[],
    sales: CreditSale[],
    currentRubro: Rubro
  ): Promise<CustomerOption[]> => {
    if (currentRubro === "Todos los rubros") {
      return customers;
    }

    const filteredCustomers = customers.filter((customer) => {
      const customerSales = sales.filter(
        (sale) => sale.customerName === customer.name
      );
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

  const customerOptions = [
    { id: "", name: "Todos los clientes" },
    ...customers,
  ];

  const handlePayInstallment = async () => {
    if (!selectedInstallment) return;

    try {
      const creditSale = creditSales.find(
        (s) => s.id === selectedInstallment.creditSaleId
      );

      if (!creditSale) {
        showNotification("No se encontró la venta a crédito", "error");
        return;
      }

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const existingPayment = dailyCash.movements.find(
          (m) =>
            m.description?.includes(
              `Pago cuota #${selectedInstallment.number}`
            ) &&
            m.customerId === creditSale.customerId &&
            m.amount === selectedInstallment.amount &&
            m.type === "INGRESO"
        );

        if (existingPayment) {
          showNotification("Esta cuota ya fue pagada", "error");
          return;
        }
      }

      await payInstallment(selectedInstallment.id!, paymentMethod);

      if (creditSale.customerId) {
        const customer = await db.customers.get(creditSale.customerId);
        if (customer) {
          const customerInstallments = await db.installments
            .where("creditSaleId")
            .equals(creditSale.id)
            .toArray();

          const pendingInstallments = customerInstallments.filter(
            (inst) => inst.status === "pendiente" || inst.status === "vencida"
          );

          const remainingAmount = pendingInstallments.reduce(
            (sum, inst) => sum + inst.amount,
            0
          );

          await db.customers.update(creditSale.customerId, {
            pendingBalance: remainingAmount,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      showNotification("Cuota pagada correctamente", "success");
      setPaymentModalOpen(false);

      await fetchInstallments();
      await checkOverdueInstallments();

      const summaries = await calculateCustomerSummaries();
      setCustomerSummaries(summaries);
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      showNotification("Error al pagar la cuota", "error");
    }
  };

  const filteredCustomerSummaries = customerSummaries.filter((summary) => {
    if (filterStatus !== "todos") {
      if (filterStatus === "pendiente" && summary.pendingInstallments === 0)
        return false;
      if (filterStatus === "vencida" && summary.overdueInstallments === 0)
        return false;
      if (filterStatus === "pagada" && summary.paidInstallments === 0)
        return false;
    }

    if (filterCustomer && summary.customerId !== filterCustomer) {
      return false;
    }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: es });
  };

  const handleOpenCustomerDetail = async (summary: CustomerCreditSummary) => {
    setSelectedCustomerSummary(summary);
    const summaries = calculateCreditSummaries(summary);
    setCreditSummaries(summaries);
    await loadCustomerPayments(summary.customerId);
    setCustomerDetailModalOpen(true);
    setExpandedCreditId(null);
    setInfoModalTab(0);
  };

  const handleCloseCustomerDetail = () => {
    setCustomerDetailModalOpen(false);
    setSelectedCustomerSummary(null);
    setCustomerPayments([]);
    setCreditSummaries([]);
    setExpandedCreditId(null);
  };

  const handleExpandCredit = (saleId: number) => {
    setExpandedCreditId(expandedCreditId === saleId ? null : saleId);
  };

  const handleTabChange = (newValue: number) => {
    setInfoModalTab(newValue);
  };

  const creditosPendientes = useMemo(() => {
    return creditSummaries.filter((credit) => credit.pendingAmount > 0);
  }, [creditSummaries]);

  const creditosPagados = useMemo(() => {
    return creditSummaries.filter((credit) => credit.pendingAmount <= 0);
  }, [creditSummaries]);

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
                  const newOption: CustomerOption = {
                    id: `custom-${Date.now()}`,
                    name: newValue,
                  };
                  setSelectedCustomerOption(newOption);
                  setFilterCustomer(newOption.id);
                  setInputValue(newValue);
                } else if (newValue && typeof newValue === "object") {
                  setSelectedCustomerOption(newValue);
                  setFilterCustomer(newValue.id);
                  setInputValue(newValue.name);
                } else {
                  setSelectedCustomerOption(null);
                  setFilterCustomer("");
                  setInputValue("");
                }
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
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

        <Box sx={{ flex: 1, minHeight: "auto" }}>
          <TableContainer component={Paper} sx={{ maxHeight: "60vh", flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderStyle}>Cliente</TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Monto Total de Créditos
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
                {currentItems.map((summary) => (
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
                      <Typography variant="body2" fontWeight="medium">
                        {summary.customerName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({summary.creditSales.length} créditos)
                      </Typography>
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
                      <Typography variant="body2">
                        {summary.totalInstallments}
                      </Typography>
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
                ))}
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

        {/* Modal de detalle del cliente refactorizado */}
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
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <AccountCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedCustomerSummary.customerName}
                  </Typography>
                </Box>
              </Box>

              <CustomerFinancialSummary
                customerInfo={{
                  name: selectedCustomerSummary.customerName,
                  balance: selectedCustomerSummary.pendingAmount,
                  sales: selectedCustomerSummary.creditSales,
                }}
                payments={customerPayments}
              />

              <Card sx={{ mb: 2 }}>
                <Tabs
                  value={infoModalTab}
                  onChange={(_, newValue) => handleTabChange(newValue)}
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: "medium",
                      minHeight: 48,
                    },
                  }}
                >
                  <Tab
                    icon={<ReceiptIcon />}
                    iconPosition="start"
                    label={
                      <Badge
                        badgeContent={creditSummaries.length}
                        color="primary"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Todos los Créditos
                      </Badge>
                    }
                  />
                  <Tab
                    icon={<PaymentIcon />}
                    iconPosition="start"
                    label={
                      <Badge
                        badgeContent={creditosPendientes.length}
                        color="warning"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Pendientes
                      </Badge>
                    }
                  />
                  <Tab
                    icon={<CheckCircle />}
                    iconPosition="start"
                    label={
                      <Badge
                        badgeContent={creditosPagados.length}
                        color="success"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Pagados
                      </Badge>
                    }
                  />
                </Tabs>
              </Card>

              <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                {infoModalTab === 0 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditSummaries.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <ReceiptIcon
                          sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos registrados
                        </Typography>
                      </Box>
                    ) : (
                      creditSummaries.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          payments={customerPayments.filter(
                            (p) => p.saleId === credit.saleId
                          )}
                          onPayment={(credit) => {
                            // Lógica para pagar una cuota específica
                            const pendingInstallment = credit.installments.find(
                              (inst) =>
                                inst.status === "pendiente" ||
                                inst.status === "vencida"
                            );
                            if (pendingInstallment) {
                              setSelectedInstallment(pendingInstallment);
                              setPaymentModalOpen(true);
                            }
                          }}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                        />
                      ))
                    )}
                  </Box>
                )}

                {infoModalTab === 1 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditosPendientes.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <CheckCircle
                          sx={{ fontSize: 64, color: "success.main", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos pendientes
                        </Typography>
                      </Box>
                    ) : (
                      creditosPendientes.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          payments={customerPayments.filter(
                            (p) => p.saleId === credit.saleId
                          )}
                          onPayment={(credit) => {
                            const pendingInstallment = credit.installments.find(
                              (inst) =>
                                inst.status === "pendiente" ||
                                inst.status === "vencida"
                            );
                            if (pendingInstallment) {
                              setSelectedInstallment(pendingInstallment);
                              setPaymentModalOpen(true);
                            }
                          }}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                        />
                      ))
                    )}
                  </Box>
                )}

                {infoModalTab === 2 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditosPagados.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <HistoryIcon
                          sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos completamente pagados
                        </Typography>
                      </Box>
                    ) : (
                      creditosPagados.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          payments={customerPayments.filter(
                            (p) => p.saleId === credit.saleId
                          )}
                          onPayment={() => {}}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                        />
                      ))
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Modal>
      </Box>
    </ProtectedRoute>
  );
};

export default CreditosPage;

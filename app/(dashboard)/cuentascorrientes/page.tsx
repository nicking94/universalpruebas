"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";

import {
  ChequeFilter,
  ChequeWithDetails,
  CreditSale,
  Customer,
  DailyCashMovement,
  Payment,
  PaymentMethod,
  PaymentSplit,
  SaleItem,
} from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import Pagination from "@/app/components/Pagination";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { usePagination } from "@/app/context/PaginationContext";
import { ClienteCuentaCorrientePDF } from "@/app/components/ClienteCuentaCorrientePDF";
import { pdf } from "@react-pdf/renderer";
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
  FormControl,
  Card,
  CardContent,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Wallet as WalletIcon,
  CheckCircle as CheckCircleIcon,
  Add,
} from "@mui/icons-material";
import Input from "@/app/components/Input";

const CuentasCorrientesPage = () => {
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: 0 },
  ]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentCreditSale, setCurrentCreditSale] = useState<CreditSale | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentCustomerInfo, setCurrentCustomerInfo] = useState<{
    name: string;
    balance: number;
    sales: CreditSale[];
  } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isChequesModalOpen, setIsChequesModalOpen] = useState(false);
  const [currentCustomerCheques, setCurrentCustomerCheques] = useState<
    ChequeWithDetails[]
  >([]);
  const [chequeFilter, setChequeFilter] = useState<ChequeFilter>("todos");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const prepareCustomerPDFData = (customerName: string) => {
    const customerSales = salesByCustomer[customerName];
    const customerBalance = calculateCustomerBalance(customerName);

    const salesData = customerSales.map((sale) => {
      const salePayments = payments.filter((p) => p.saleId === sale.id);
      const totalPayments = salePayments.reduce((sum, p) => {
        if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
          return sum;
        }
        return sum + p.amount;
      }, 0);
      const remainingBalance = sale.total - totalPayments;
      const isPaid = remainingBalance <= 0;

      return {
        id: sale.id,
        date: sale.date,
        products: sale.products.map((product) => ({
          name: getDisplayProductName(
            {
              name: product.name,
              size: product.size,
              color: product.color,
              rubro: product.rubro,
            },
            rubro,
            false
          ),
          quantity: product.quantity,
          unit: product.unit,
          price: product.price,
          size: product.size,
          color: product.color,
        })),
        total: sale.total,
        totalPayments,
        remainingBalance,
        isPaid,
      };
    });

    const totalDeuda = salesData.reduce(
      (sum, sale) =>
        sale.remainingBalance > 0 ? sum + sale.remainingBalance : sum,
      0
    );

    const totalPagado = salesData.reduce(
      (sum, sale) => sum + sale.totalPayments,
      0
    );

    return {
      customerName,
      sales: salesData,
      totalBalance: customerBalance,
      totalDeuda,
      totalPagado,
      fechaReporte: format(new Date(), "dd/MM/yyyy", { locale: es }),
    };
  };

  const filteredSales = creditSales
    .filter((sale) => {
      const matchesSearch = sale.customerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRubro =
        rubro === "Todos los rubros" ||
        sale.products.some((product) => product.rubro === rubro);

      return matchesSearch && matchesRubro;
    })
    .sort((a, b) => {
      if (a.paid !== b.paid) {
        return a.paid ? 1 : -1;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const salesByCustomer = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.customerName]) {
      acc[sale.customerName] = [];
    }
    acc[sale.customerName].push(sale);
    return acc;
  }, {} as Record<string, CreditSale[]>);

  const sortedCustomerNames = Object.keys(salesByCustomer).sort((a, b) => {
    const customerAHasUnpaid = salesByCustomer[a].some((sale) => !sale.paid);
    const customerBHasUnpaid = salesByCustomer[b].some((sale) => !sale.paid);
    if (customerAHasUnpaid !== customerBHasUnpaid) {
      return customerAHasUnpaid ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  const uniqueCustomers = Object.keys(salesByCustomer);
  const totalCustomers = uniqueCustomers.length;
  const indexOfLastCredit = currentPage * itemsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - itemsPerPage;
  const currentCustomers = sortedCustomerNames.slice(
    indexOfFirstCredit,
    indexOfLastCredit
  );

  const isFirstGreater = (a: number, b: number, epsilon = 0.01) => {
    return a - b > epsilon;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allSales = await db.sales.toArray();
        const sales = allSales.filter((sale) => sale.credit === true);

        const [payments, customers] = await Promise.all([
          db.payments.toArray(),
          db.customers.toArray(),
        ]);

        setCreditSales(sales as CreditSale[]);
        setPayments(payments);
        setCustomers(customers);
      } catch (error) {
        console.error("Error loading data:", error);
        showNotification("Error al cargar las cuentas corrientes", "error");
      }
    };

    fetchData();
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
  };

  const calculateCustomerBalance = (customerName: string) => {
    const customerSales = creditSales.filter(
      (sale) => sale.customerName === customerName && !sale.chequeInfo
    );

    const customerPayments = payments.filter((p) =>
      customerSales.some((s) => s.id === p.saleId)
    );

    const totalSales = customerSales.reduce((sum, sale) => sum + sale.total, 0);

    const totalPayments = customerPayments.reduce((sum, p) => {
      if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
        return sum;
      }
      return sum + p.amount;
    }, 0);

    return totalSales - totalPayments;
  };

  const calculateRemainingBalance = (sale: CreditSale) => {
    if (!sale || sale.chequeInfo) return 0;

    const salePayments = payments.filter((p) => p.saleId === sale.id);

    const totalPayments = salePayments.reduce((sum, p) => {
      if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
        return sum;
      }
      return sum + p.amount;
    }, 0);

    return sale.total - totalPayments;
  };

  const addIncomeToDailyCash = async (sale: CreditSale) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      const totalSaleAmount = sale.total;
      const totalProfit = sale.products.reduce((sum, product) => {
        const productProfit =
          (product.price - (product.costPrice || 0)) * product.quantity;
        return sum + productProfit;
      }, 0);

      sale.paymentMethods.forEach((payment) => {
        const paymentRatio = payment.amount / totalSaleAmount;
        const paymentProfit = totalProfit * paymentRatio;

        movements.push({
          id: Date.now(),
          amount: payment.amount,
          description: `Cuenta corriente de ${sale.customerName}`,
          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod: payment.method,
          items: sale.products.map((p) => ({
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: p.price,
          })),
          profit: paymentProfit,
          isCreditPayment: true,
          originalSaleId: sale.id,
        });
      });

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
          totalProfit:
            (dailyCash.totalProfit || 0) +
            movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso en caja diaria:", error);
      throw error;
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleExportCustomerPDF = async (customerName: string) => {
    setIsGeneratingPDF(true);
    try {
      const pdfData = prepareCustomerPDFData(customerName);
      const blob = await pdf(
        <ClienteCuentaCorrientePDF {...pdfData} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const fileName = `cuenta-corriente-${customerName.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}-${format(new Date(), "dd-MM-yyyy")}.pdf`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification(
        `PDF de ${customerName} generado correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al generar PDF:", error);
      showNotification("Error al generar PDF", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleMarkCheckAsPaid = async (checkId: number) => {
    try {
      const payment = await db.payments.get(checkId);
      if (!payment) return;

      const sale = await db.sales.get(payment.saleId);
      if (!sale) return;

      const totalProfit = sale.products.reduce((sum, product) => {
        const cost = product.costPrice || 0;
        return sum + (product.price - cost) * product.quantity;
      }, 0);

      const paymentRatio = payment.amount / sale.total;
      const profitCheque = totalProfit * paymentRatio;

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: payment.amount,
        description: `Cobro de cheque - ${payment.customerName}`,
        type: "INGRESO",
        date: new Date().toISOString(),
        paymentMethod: "CHEQUE",
        isCreditPayment: true,
        originalSaleId: payment.saleId,
        profit: profitCheque,
        items: sale.products.map((p) => ({
          productId: p.id,
          productName: p.name,
          quantity: p.quantity,
          unit: p.unit,
          price: p.price,
        })),
      };

      if (dailyCash) {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, movement],
          totalIncome: (dailyCash.totalIncome || 0) + payment.amount,
          totalProfit: (dailyCash.totalProfit || 0) + (profitCheque || 0),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      } else {
        await db.dailyCashes.add({
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: payment.amount,
          totalExpense: 0,
          totalProfit: profitCheque || 0,
        });
      }

      await db.payments.update(checkId, { checkStatus: "cobrado" });
      await db.sales.update(payment.saleId, {
        "chequeInfo.status": "cobrado",
      } as Partial<CreditSale>);

      const updatedPayments = await db.payments.toArray();
      const updatedSales = await db.sales.toArray();

      setPayments(updatedPayments);
      setCreditSales(updatedSales.filter((s) => s.credit) as CreditSale[]);
      setCurrentCustomerCheques(
        currentCustomerCheques.map((c) =>
          c.id === checkId ? { ...c, checkStatus: "cobrado" } : c
        )
      );

      showNotification(
        "Cheque marcado como cobrado e ingresado en caja",
        "success"
      );
    } catch (error) {
      console.error("Error al actualizar estado del cheque:", error);
      showNotification("Error al actualizar cheque", "error");
    }
  };

  const handleDeleteCheck = async (checkId: number) => {
    try {
      const cheque = await db.payments.get(checkId);
      if (!cheque) {
        showNotification("Cheque no encontrado", "error");
        return;
      }

      await db.payments.delete(checkId);

      const remainingPayments = await db.payments
        .where("saleId")
        .equals(cheque.saleId)
        .toArray();

      if (remainingPayments.length === 0) {
        await db.sales.delete(cheque.saleId);
      } else {
        const sale = await db.sales.get(cheque.saleId);
        if (sale) {
          await db.sales.update(cheque.saleId, {
            paid: remainingPayments.some(
              (p) => p.method !== "CHEQUE" || p.checkStatus === "cobrado"
            ),
            chequeInfo: undefined,
          });
        }
      }

      const [updatedPayments, updatedSales] = await Promise.all([
        db.payments.toArray(),
        db.sales.toArray(),
      ]);

      setPayments(updatedPayments);
      setCreditSales(updatedSales.filter((s) => s.credit) as CreditSale[]);

      setCurrentCustomerCheques(
        currentCustomerCheques.filter((c) => c.id !== checkId)
      );

      if (currentCustomerInfo) {
        const customerSales = updatedSales.filter(
          (s) => s.credit && s.customerName === currentCustomerInfo.name
        ) as CreditSale[];

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          balance: calculateCustomerBalance(currentCustomerInfo.name),
          sales: customerSales,
        });
      }

      showNotification("Cheque eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar cheque:", error);
      showNotification("Error al eliminar cheque", "error");
    }
  };

  const handleDeleteCustomerCredits = async () => {
    if (!customerToDelete) return;

    try {
      const customer = customers.find((c) => c.name === customerToDelete);

      if (!customer) {
        showNotification("Cliente no encontrado", "error");
        return;
      }

      const salesToDelete = creditSales
        .filter((sale) => sale.customerName === customerToDelete)
        .map((sale) => sale.id);

      await db.sales.bulkDelete(salesToDelete);
      await db.payments.where("saleId").anyOf(salesToDelete).delete();

      setCreditSales(
        creditSales.filter((sale) => sale.customerName !== customerToDelete)
      );
      setPayments(payments.filter((p) => !salesToDelete.includes(p.saleId)));

      showNotification(
        `Todas las cuentas corrientes de ${customerToDelete} eliminadas`,
        "success"
      );
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setIsInfoModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar cuentas corrientes:", error);
      showNotification("Error al eliminar cuentas corrientes", "error");
    }
  };

  const validateCurrency = (value: string): boolean => {
    return /^\d+(\.\d{1,2})?$/.test(value);
  };

  const handlePayment = async () => {
    const invalidPayment = paymentMethods.some(
      (method) => !validateCurrency(method.amount.toString())
    );

    if (invalidPayment) {
      showNotification("Los montos deben tener hasta 2 decimales", "error");
      return;
    }
    if (!currentCreditSale) return;

    const totalPayment = parseFloat(
      paymentMethods.reduce((sum, method) => sum + method.amount, 0).toFixed(2)
    );
    const remainingBalance = parseFloat(
      calculateRemainingBalance(currentCreditSale).toFixed(2)
    );

    if (totalPayment <= 0) {
      showNotification("El monto debe ser mayor a cero", "error");
      return;
    }

    if (isFirstGreater(totalPayment, remainingBalance)) {
      showNotification("El monto excede el saldo pendiente", "error");
      return;
    }

    try {
      const [updatedSales, updatedPayments] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
      ]);

      setCreditSales(
        updatedSales.filter((sale) => sale.credit === true) as CreditSale[]
      );
      setPayments(updatedPayments);

      for (const method of paymentMethods) {
        if (method.amount > 0) {
          const newPayment: Payment = {
            id: Date.now() + Math.random(),
            saleId: currentCreditSale.id,
            saleDate: currentCreditSale.date,
            amount: method.amount,
            date: new Date().toISOString(),
            method: method.method,
          };
          await db.payments.add(newPayment);
        }
      }

      const newRemainingBalance = remainingBalance - totalPayment;

      if (newRemainingBalance <= 0.01) {
        await db.sales.update(currentCreditSale.id, {
          paid: true,
        } as Partial<CreditSale>);
      }

      const allSales = await db.sales.toArray();
      const sales = allSales.filter((sale) => sale.credit === true);
      const allPayments = await db.payments.toArray();

      setCreditSales(sales as CreditSale[]);
      setPayments(allPayments);

      if (newRemainingBalance <= 0.01) {
        const saleToRegister: CreditSale = {
          ...currentCreditSale,
          total: totalPayment,
          paid: true,
          paymentMethods: paymentMethods.filter((m) => m.amount > 0),
        };
        await addIncomeToDailyCash(saleToRegister);
      }

      showNotification("Pago registrado correctamente", "success");
      setIsPaymentModalOpen(false);
      setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);

      if (currentCustomerInfo) {
        const updatedSales = (await db.sales
          .where("customerName")
          .equals(currentCustomerInfo.name)
          .toArray()) as CreditSale[];

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          balance:
            updatedSales.reduce((total, sale) => total + (sale.total || 0), 0) -
            allPayments
              .filter((p) => updatedSales.some((s) => s.id === p.saleId))
              .reduce((sum, p) => sum + p.amount, 0),
          sales: updatedSales,
        });
      }
    } catch (error) {
      console.error("Error al registrar pago:", error);
      showNotification("Error al registrar pago", "error");
    }
  };

  const handleOpenChequesModal = async (customerName: string) => {
    try {
      const customerCheques = await db.payments
        .where("method")
        .equals("CHEQUE")
        .and((p) => p.customerName === customerName)
        .toArray();

      const chequesWithDetails = await Promise.all(
        customerCheques.map(async (cheque) => {
          const sale = await db.sales.get(cheque.saleId);

          const saleItems: SaleItem[] =
            sale?.products?.map((product) => ({
              productId: product.id,
              productName: product.name,
              quantity: product.quantity,
              unit: product.unit,
              price: product.price,
              size: product.size,
              color: product.color,
              rubro: product.rubro,
            })) || [];

          return {
            ...cheque,
            saleDate: sale?.date || "",
            products: saleItems,
            saleTotal: sale?.total || 0,
          };
        })
      );

      setCurrentCustomerCheques(chequesWithDetails);
      setIsChequesModalOpen(true);
    } catch (error) {
      console.error("Error al cargar cheques:", error);
      showNotification("Error al cargar cheques del cliente", "error");
    }
  };

  const handleOpenInfoModal = (sale: CreditSale) => {
    const customerSales = creditSales.filter(
      (cs) => cs.customerName === sale.customerName && !cs.chequeInfo
    );

    setCurrentCustomerInfo({
      name: sale.customerName,
      balance: calculateCustomerBalance(sale.customerName),
      sales: customerSales,
    });
    setIsInfoModalOpen(true);
  };

  // Componentes de Modal personalizados
  const ChequesModal = () => (
    <Modal
      isOpen={isChequesModalOpen}
      onClose={() => setIsChequesModalOpen(false)}
      title={`Cheques de ${currentCustomerInfo?.name || "Cliente"}`}
      buttons={
        <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
          <Button
            variant="outlined"
            onClick={() => setIsChequesModalOpen(false)}
          >
            Cerrar
          </Button>
        </Box>
      }
    >
      {currentCustomerCheques.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <WalletIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography color="text.secondary">
            El cliente no tiene cheques registrados
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              Filtrar por estado:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Estado"
                value={chequeFilter}
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "pendiente", label: "Pendientes" },
                  { value: "cobrado", label: "Cobrados" },
                ]}
                onChange={(value: string | number) =>
                  setChequeFilter(value as ChequeFilter)
                }
                size="small"
              />
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: "55vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Monto
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Fecha
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Estado
                  </TableCell>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Productos
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentCustomerCheques
                  .filter(
                    (cheque) =>
                      chequeFilter === "todos" ||
                      cheque.checkStatus === chequeFilter
                  )
                  .map((cheque, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        {cheque.amount.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        })}
                      </TableCell>
                      <TableCell align="center">
                        {format(new Date(cheque.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={cheque.checkStatus || "pendiente"}
                          color={
                            cheque.checkStatus === "cobrado"
                              ? "success"
                              : cheque.checkStatus === "pendiente"
                              ? "warning"
                              : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ maxHeight: 80, overflow: "auto" }}>
                          {cheque.products?.map((product, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                py: 0.5,
                                borderBottom:
                                  idx < cheque.products.length - 1
                                    ? "1px solid"
                                    : "none",
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <Typography variant="caption">
                                  {getDisplayProductName(
                                    {
                                      name: product.productName,
                                      size: product.size,
                                      color: product.color,
                                      rubro: product.rubro,
                                    },
                                    rubro,
                                    true
                                  )}
                                </Typography>
                                <Typography variant="caption">
                                  {product.quantity} {product.unit}
                                </Typography>
                                <Typography variant="caption">
                                  {product.price.toLocaleString("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                  })}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          {cheque.checkStatus === "pendiente" && (
                            <IconButton
                              onClick={() => handleMarkCheckAsPaid(cheque.id)}
                              size="small"
                              sx={{
                                borderRadius: "4px",
                                color: "success.main",
                                "&:hover": {
                                  backgroundColor: "success.main",
                                  color: "white",
                                },
                              }}
                              title="Marcar como cobrado"
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => handleDeleteCheck(cheque.id)}
                            size="small"
                            sx={{
                              borderRadius: "4px",
                              color: "error.main",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                            title="Eliminar cheque"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Modal>
  );

  const InfoModal = () => (
    <Modal
      isOpen={isInfoModalOpen}
      onClose={() => setIsInfoModalOpen(false)}
      title={`Cuentas corrientes de ${currentCustomerInfo?.name || "Cliente"}`}
      buttons={
        <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (currentCustomerInfo) {
                handleExportCustomerPDF(currentCustomerInfo.name);
                setIsInfoModalOpen(false);
              }
            }}
          >
            Descargar PDF
          </Button>
          <Button variant="outlined" onClick={() => setIsInfoModalOpen(false)}>
            Cerrar
          </Button>
        </Box>
      }
    >
      <Box sx={{ maxHeight: "70vh", overflow: "auto", mb: 2 }}>
        {/* Header con información del cliente */}
        <Card
          sx={{
            background: "linear-gradient(135deg, #3b82f6, #1e40af)",
            color: "white",
            mb: 3,
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Cliente
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentCustomerInfo?.name}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h6" fontWeight="bold" mb={1}>
                  Estado
                </Typography>
                <Chip
                  label={
                    (currentCustomerInfo?.balance ?? 0) <= 0
                      ? "Al día"
                      : "En deuda"
                  }
                  color={
                    (currentCustomerInfo?.balance ?? 0) <= 0
                      ? "success"
                      : "error"
                  }
                  sx={{ color: "white", fontWeight: "bold" }}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Card sx={{ bgcolor: "rgba(255,255,255,0.2)", flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {currentCustomerInfo?.sales
                      .reduce((sum, sale) => sum + sale.total, 0)
                      .toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ bgcolor: "rgba(255,255,255,0.2)", flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total pagado
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {currentCustomerInfo?.sales
                      .reduce((sum, sale) => {
                        const paymentsForSale = payments
                          .filter((p) => p.saleId === sale.id)
                          .reduce((sum, p) => sum + p.amount, 0);
                        return sum + paymentsForSale;
                      }, 0)
                      .toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ bgcolor: "rgba(255,255,255,0.2)", flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Saldo pendiente
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {(currentCustomerInfo?.balance ?? 0).toLocaleString(
                      "es-AR",
                      {
                        style: "currency",
                        currency: "ARS",
                      }
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>

        {/* Historial de ventas */}
        <Typography variant="h6" fontWeight="medium" mb={2}>
          Historial de cuentas corrientes
        </Typography>

        {currentCustomerInfo?.sales
          .sort((a, b) => {
            const aBalance = calculateRemainingBalance(a);
            const bBalance = calculateRemainingBalance(b);
            const aPaid = aBalance <= 0;
            const bPaid = bBalance <= 0;
            if (aPaid !== bPaid) {
              return aPaid ? 1 : -1;
            }
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          })
          .map((sale) => {
            const totalPayments = payments
              .filter((p) => p.saleId === sale.id)
              .reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = sale.total - totalPayments;
            const isPaid = remainingBalance <= 0;

            return (
              <Card
                key={sale.id}
                sx={{
                  mb: 2,
                  border: 1,
                  borderColor: isPaid ? "success.light" : "error.light",
                  bgcolor: isPaid ? "success.50" : "error.50",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="medium">
                      {format(new Date(sale.date), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </Typography>
                    {!isPaid && (
                      <Button
                        variant="contained"
                        onClick={() => {
                          setCurrentCreditSale(sale);
                          setIsPaymentModalOpen(true);
                          setIsInfoModalOpen(false);
                        }}
                      >
                        Pagar
                      </Button>
                    )}
                  </Box>

                  {/* Detalles de productos */}
                  <Typography variant="body2" fontWeight="medium" mb={1}>
                    Detalles
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                          <TableCell align="right">Precio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sale.products.map((product, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              {getDisplayProductName(
                                {
                                  name: product.name,
                                  size: product.size,
                                  color: product.color,
                                  rubro: product.rubro,
                                },
                                rubro,
                                true
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {product.quantity} {product.unit}
                            </TableCell>
                            <TableCell align="right">
                              {product.price.toLocaleString("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Resumen financiero */}
                  <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Card
                      sx={{
                        bgcolor: isPaid ? "success.100" : "error.100",
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          Saldo pendiente
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color={isPaid ? "success.main" : "error.main"}
                        >
                          {remainingBalance.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        bgcolor: "grey.100",
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          Pagado
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {totalPayments.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        bgcolor: "grey.100",
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          Total
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {sale.total.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
      </Box>
    </Modal>
  );
  const PaymentModal = () => (
    <Modal
      isOpen={isPaymentModalOpen}
      onClose={() => setIsPaymentModalOpen(false)}
      title={`Registrar Pago - ${currentCreditSale?.customerName || "Cliente"}`}
      buttons={
        <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={
              paymentMethods.reduce((sum, m) => sum + m.amount, 0) <= 0 ||
              isFirstGreater(
                paymentMethods.reduce((sum, m) => sum + m.amount, 0),
                calculateRemainingBalance(currentCreditSale!)
              )
            }
          >
            Registrar
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setIsPaymentModalOpen(false);
              setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
            }}
          >
            Cancelar
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Información de deuda pendiente */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              Deuda pendiente:
            </Typography>
            <Chip
              label={calculateRemainingBalance(
                currentCreditSale!
              ).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
              color="primary"
              variant="filled"
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const remaining = calculateRemainingBalance(currentCreditSale!);
              setPaymentMethods([{ method: "EFECTIVO", amount: remaining }]);
            }}
          >
            Pagar todo
          </Button>
        </Box>

        {/* Métodos de pago */}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" mb={2}>
            Métodos de Pago
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {paymentMethods.map((method, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <FormControl sx={{ minWidth: 140 }}>
                  <Select
                    label="Método"
                    value={method.method}
                    options={[
                      { value: "EFECTIVO", label: "Efectivo" },
                      { value: "TRANSFERENCIA", label: "Transferencia" },
                      { value: "TARJETA", label: "Tarjeta" },
                    ]}
                    onChange={(value) =>
                      handlePaymentMethodChange(
                        index,
                        "method",
                        value as PaymentMethod
                      )
                    }
                  />
                </FormControl>

                <Input
                  type="number"
                  value={method.amount}
                  onRawChange={(e) =>
                    handlePaymentMethodChange(
                      index,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  step="0.01"
                />

                {paymentMethods.length > 1 && (
                  <IconButton
                    onClick={() => removePaymentMethod(index)}
                    size="small"
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.main",
                        color: "white",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          {paymentMethods.length < 3 && (
            <Button
              variant="text"
              startIcon={<Add />}
              onClick={addPaymentMethod}
              sx={{ mt: 1 }}
            >
              Agregar otro método
            </Button>
          )}
        </Box>

        {/* Resumen del pago */}
        <Card
          sx={{
            backgroundColor: "primary.main",
            color: "white",
            textAlign: "center",
          }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Total a pagar
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {paymentMethods
                .reduce((sum, m) => sum + m.amount, 0)
                .toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
            </Typography>

            {isFirstGreater(
              paymentMethods.reduce((sum, m) => sum + m.amount, 0),
              calculateRemainingBalance(currentCreditSale!)
            ) && (
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  color: "warning.main",
                  fontWeight: "medium",
                }}
              >
                El monto total excede la deuda pendiente
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Modal>
  );

  // Funciones auxiliares para el manejo de métodos de pago
  const addPaymentMethod = () => {
    setPaymentMethods((prev) => {
      if (prev.length >= 3) return prev;

      const total = calculateRemainingBalance(currentCreditSale!);
      const usedMethods = prev.map((m) => m.method);
      const availableMethod = [
        { value: "EFECTIVO", label: "Efectivo" },
        { value: "TRANSFERENCIA", label: "Transferencia" },
        { value: "TARJETA", label: "Tarjeta" },
      ].find((option) => !usedMethods.includes(option.value as PaymentMethod));

      if (!availableMethod) return prev;

      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = total / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: availableMethod.value as PaymentMethod,
            amount: share,
          },
        ];
      }

      return [
        ...prev,
        {
          method: availableMethod.value as PaymentMethod,
          amount: 0,
        },
      ];
    });
  };

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setPaymentMethods((prev) => {
      const updated = [...prev];
      const remainingBalance = calculateRemainingBalance(currentCreditSale!);

      if (field === "amount") {
        const numericValue = typeof value === "number" ? value : 0;

        updated[index] = {
          ...updated[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };

        if (updated.length === 2) {
          const totalPayment = updated.reduce((sum, m) => sum + m.amount, 0);
          const difference = remainingBalance - totalPayment;

          if (difference !== 0) {
            const otherIndex = index === 0 ? 1 : 0;
            updated[otherIndex].amount = Math.max(
              0,
              updated[otherIndex].amount + difference
            );
          }
        }
      } else {
        updated[index] = {
          ...updated[index],
          method: value as PaymentMethod,
        };
      }
      return updated;
    });
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods((prev) => {
      if (prev.length <= 1) return prev;

      const updatedMethods = [...prev];
      updatedMethods.splice(index, 1);

      const total = calculateRemainingBalance(currentCreditSale!);

      if (updatedMethods.length === 1) {
        updatedMethods[0].amount = total;
      } else {
        const share = total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return updatedMethods;
    });
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 2,
          py: 2,
          height: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Cuentas corrientes
        </Typography>

        {/* Barra de búsqueda */}
        <Box sx={{ mb: 2 }}>
          <SearchBar onSearch={handleSearch} />
        </Box>

        {/* Tabla de cuentas corrientes */}
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
              sx={{ maxHeight: "59vh", flex: 1 }}
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
                      Cliente
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
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
                      Deuda
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
                  {totalCustomers > 0 ? (
                    currentCustomers.map((customerName) => {
                      const sales = salesByCustomer[customerName];
                      const customerBalance =
                        calculateCustomerBalance(customerName);
                      const sortedSales = [...sales].sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime()
                      );
                      const oldestSale = sortedSales[0];

                      return (
                        <TableRow key={customerName} hover>
                          <TableCell>
                            <Typography fontWeight="bold">
                              {customerName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {format(new Date(oldestSale.date), "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              fontWeight="bold"
                              color={
                                customerBalance <= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                            >
                              {customerBalance.toLocaleString("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              })}
                            </Typography>
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 1,
                                }}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleExportCustomerPDF(customerName)
                                  }
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Descargar PDF"
                                  disabled={isGeneratingPDF}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() =>
                                    handleOpenChequesModal(customerName)
                                  }
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Ver cheques"
                                >
                                  <WalletIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() =>
                                    handleOpenInfoModal(oldestSale)
                                  }
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Ver información"
                                >
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() => {
                                    setCustomerToDelete(customerName);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Eliminar cuentas"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 4 : 3}
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
                          <WalletIcon sx={{ fontSize: 64, mb: 2 }} />
                          <Typography>
                            No hay cuentas corrientes registradas.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {totalCustomers > 0 && (
            <Pagination
              text="Cuentas corrientes por página"
              text2="Total de cuentas corrientes"
              totalItems={totalCustomers}
            />
          )}
        </Box>

        {/* Modales personalizados */}
        <ChequesModal />
        <InfoModal />

        {/* Modales existentes (manteniendo tu estructura) */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Registrar Pago - ${
            currentCreditSale?.customerName || "Cliente"
          }`}
          buttons={
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <Button
                variant="contained"
                onClick={handlePayment}
                disabled={
                  paymentMethods.reduce((sum, m) => sum + m.amount, 0) <= 0 ||
                  isFirstGreater(
                    paymentMethods.reduce((sum, m) => sum + m.amount, 0),
                    calculateRemainingBalance(currentCreditSale!)
                  )
                }
              >
                Registrar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
                }}
              >
                Cancelar
              </Button>
            </Box>
          }
        >
          <PaymentModal />
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Cuentas corrientes"
          buttons={
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteCustomerCredits}
              >
                Si
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                No
              </Button>
            </Box>
          }
        >
          <Box sx={{ spaceY: 6 }}>
            <Typography>
              ¿Está seguro que desea eliminar TODAS las cuentas corrientes de{" "}
              {customerToDelete}?
            </Typography>
            <Typography fontWeight="bold" color="error.main">
              Deuda pendiente:{" "}
              {calculateCustomerBalance(customerToDelete || "").toLocaleString(
                "es-AR",
                {
                  style: "currency",
                  currency: "ARS",
                }
              )}
            </Typography>
          </Box>
        </Modal>

        {/* Notification personalizada */}
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={() => setIsNotificationOpen(false)}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default CuentasCorrientesPage;

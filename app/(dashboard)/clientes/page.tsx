"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { Budget, CreditSale, Customer, Sale } from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import SearchBar from "@/app/components/SearchBar";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import { calculateCustomerBalance } from "@/app/lib/utils/balanceCalculations";
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
  useTheme,
} from "@mui/material";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import Select from "@/app/components/Select";
import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";
import { useNotification } from "@/app/hooks/useNotification";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Email,
  Badge,
  Groups,
  Assignment,
} from "@mui/icons-material";

const ClientesPage = () => {
  const { rubro } = useRubro();
  const theme = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<
    Omit<Customer, "id" | "createdAt" | "updatedAt" | "purchaseHistory">
  >({
    name: "",
    phone: "",
    email: "",
    address: "",
    cuitDni: "",
    status: "activo",
    pendingBalance: 0,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerBudgets, setCustomerBudgets] = useState<Budget[]>([]);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isDeleteBudgetModalOpen, setIsDeleteBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();
  const { currentPage, itemsPerPage, setCurrentPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const [customerBalances, setCustomerBalances] = useState<
    Record<string, number>
  >({});

  const getTableHeaderStyle = () => ({
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  });

  const statusOptions = [
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
  ];

  useEffect(() => {
    const fetchCreditData = async () => {
      try {
        const [allSales, allPayments] = await Promise.all([
          db.sales.toArray(),
          db.payments.toArray(),
        ]);

        const creditSalesData = allSales.filter(
          (sale) => sale.credit === true
        ) as CreditSale[];

        const balances: Record<string, number> = {};
        creditSalesData.forEach((sale) => {
          if (!balances[sale.customerName]) {
            balances[sale.customerName] = calculateCustomerBalance(
              sale.customerName,
              creditSalesData,
              allPayments
            );
          }
        });

        setCustomerBalances(balances);
      } catch (error) {
        console.error("Error al cargar datos de cuentas corrientes:", error);
      }
    };

    fetchCreditData();
  }, []);

  useEffect(() => {
    const fetchCustomerBudgets = async () => {
      if (selectedCustomer) {
        try {
          const budgets = await db.budgets
            .where("customerId")
            .equals(selectedCustomer.id)
            .toArray();
          if (selectedCustomer) {
            setCustomerBudgets(budgets);
          }
        } catch (error) {
          console.error("Error al cargar presupuestos:", error);
          showNotification("Error al cargar los presupuestos", "error");
        }
      }
    };

    fetchCustomerBudgets();
  }, [selectedCustomer]);

  useEffect(() => {
    const fetchCustomerSales = async () => {
      if (selectedCustomer) {
        try {
          const sales = await db.sales
            .where("customerId")
            .equals(selectedCustomer.id)
            .or("customerName")
            .equals(selectedCustomer.name)
            .toArray();

          if (selectedCustomer) {
            setCustomerSales(sales);
          }
        } catch (error) {
          console.error("Error al cargar ventas:", error);
          showNotification("Error al cargar el historial de compras", "error");
        }
      }
    };

    fetchCustomerSales();
  }, [selectedCustomer]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      const sortedCustomers = [...allCustomers].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const filtered = sortedCustomers.filter((customer) => {
        if (rubro === "Todos los rubros") return true;
        return customer.rubro === rubro;
      });

      const searched = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.cuitDni?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setCustomers(sortedCustomers);
      setFilteredCustomers(searched);
    };

    fetchCustomers();
  }, [rubro, searchQuery]);

  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );

      if (existingCustomer) {
        showNotification("Ya existe un cliente con este nombre", "error");
        return;
      }

      const customerToAdd: Customer = {
        ...newCustomer,
        id: generateCustomerId(newCustomer.name),
        name: newCustomer.name.trim(),
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
        purchaseHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.customers.add(customerToAdd);
      setCustomers([...customers, customerToAdd]);
      setFilteredCustomers([...filteredCustomers, customerToAdd]);
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        cuitDni: "",
        status: "activo",
        pendingBalance: 0,
      });
      setIsModalOpen(false);
      showNotification("Cliente agregado correctamente", "success");
    } catch (error) {
      console.error("Error al agregar cliente:", error);
      showNotification("Error al agregar cliente", "error");
    }
  };

  const generateCustomerId = (name: string): string => {
    const cleanName = name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    const timestamp = Date.now().toString().slice(-5);
    return `${cleanName}-${timestamp}`;
  };

  const getCustomerPendingBalance = (customer: Customer): number => {
    return customerBalances[customer.name] || 0;
  };

  const handleConfirmDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      await db.budgets.delete(budgetToDelete.id);
      setCustomerBudgets(
        customerBudgets.filter((b) => b.id !== budgetToDelete.id)
      );
      showNotification("Presupuesto eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      showNotification("Error al eliminar presupuesto", "error");
    } finally {
      setIsDeleteBudgetModalOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    const pendingBalance = getCustomerPendingBalance(customer);

    if (pendingBalance > 0) {
      showNotification(
        `No se puede eliminar el cliente porque tiene un saldo pendiente de $${pendingBalance.toFixed(
          2
        )}`,
        "error"
      );
      return;
    }

    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const customerSales = await db.sales
        .where("customerId")
        .equals(customerToDelete.id)
        .toArray();

      if (customerSales.length > 0) {
        showNotification(
          "No se puede eliminar el cliente porque tiene una cuenta corriente pendiente de pago",
          "error"
        );
        return;
      }

      await db.customers.delete(customerToDelete.id);
      setFilteredCustomers(
        filteredCustomers.filter((c) => c.id !== customerToDelete.id)
      );
      setCustomers(customers.filter((c) => c.id !== customerToDelete.id));
      showNotification("Cliente eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      showNotification("Error al eliminar cliente", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      cuitDni: customer.cuitDni || "",
      status: customer.status,
      pendingBalance: customer.pendingBalance,
    });
    setIsModalOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !newCustomer.name.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const existingCustomer = customers.find(
        (c) =>
          c.id !== editingCustomer.id &&
          c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );

      if (existingCustomer) {
        showNotification("Ya existe un cliente con este nombre", "error");
        return;
      }

      const updatedCustomer = {
        ...editingCustomer,
        name: newCustomer.name.trim(),
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        cuitDni: newCustomer.cuitDni,
        status: newCustomer.status,
        pendingBalance: newCustomer.pendingBalance,
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
        updatedAt: new Date().toISOString(),
      };

      await db.transaction(
        "rw",
        db.customers,
        db.sales,
        db.budgets,
        async () => {
          await db.customers.update(editingCustomer.id, updatedCustomer);

          const customerSales = await db.sales
            .where("customerId")
            .equals(editingCustomer.id)
            .toArray();

          await Promise.all(
            customerSales.map((sale) =>
              db.sales.update(sale.id, {
                customerName: updatedCustomer.name,
              })
            )
          );

          if (editingBudget) {
            const updatedBudget = {
              ...editingBudget,
              customerName: updatedCustomer.name,
              updatedAt: new Date().toISOString(),
            };
            await db.budgets.update(editingBudget.id, updatedBudget);
          }
        }
      );

      setCustomers(
        customers.map((c) =>
          c.id === editingCustomer.id ? updatedCustomer : c
        )
      );

      setFilteredCustomers(
        filteredCustomers.map((c) =>
          c.id === editingCustomer.id ? updatedCustomer : c
        )
      );

      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        cuitDni: "",
        status: "activo",
        pendingBalance: 0,
      });
      setEditingCustomer(null);
      setEditingBudget(null);
      setIsModalOpen(false);
      showNotification("Cliente actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      showNotification("Error al actualizar cliente", "error");
    }
  };

  const handleViewPurchaseHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSalesModalOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleViewBudgetItems = (budget: Budget) => {
    setSelectedBudget(budget);
  };

  const BudgetsModal = () => (
    <Modal
      isOpen={isBudgetsModalOpen}
      onClose={() => {
        setIsBudgetsModalOpen(false);
        setSelectedCustomer(null);
        setSelectedBudget(null);
        setCustomerBudgets([]);
      }}
      title={
        selectedBudget
          ? "Detalles del Presupuesto"
          : `Presupuestos de ${selectedCustomer?.name || ""}`
      }
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          {selectedBudget ? (
            <>
              <Button
                variant="text"
                onClick={() => {
                  setIsBudgetsModalOpen(false);
                  setSelectedCustomer(null);
                  setSelectedBudget(null);
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
              <Button
                variant="contained"
                onClick={() => setSelectedBudget(null)}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Volver
              </Button>
            </>
          ) : (
            <Button
              variant="text"
              onClick={() => {
                setIsBudgetsModalOpen(false);
                setSelectedCustomer(null);
                setSelectedBudget(null);
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
          )}
        </Box>
      }
    >
      {selectedBudget ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Fecha:
              </Typography>
              <Typography>
                {new Date(selectedBudget.date).toLocaleDateString("es-AR")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Total:
              </Typography>
              <Typography>${selectedBudget.total.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Seña:
              </Typography>
              <Typography>${selectedBudget.deposit || "0.00"}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Saldo:
              </Typography>
              <Typography>${selectedBudget.remaining.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ gridColumn: "span 2" }}>
              <Typography variant="subtitle2" fontWeight="bold">
                Estado:
              </Typography>
              <Chip
                label={selectedBudget.status}
                color={
                  selectedBudget.status === "aprobado"
                    ? "success"
                    : selectedBudget.status === "rechazado"
                    ? "error"
                    : "warning"
                }
                size="small"
              />
            </Box>
            {selectedBudget.notes && (
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Notas:
                </Typography>
                <Typography>{selectedBudget.notes}</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" fontWeight="medium" mb={2}>
              Items del Presupuesto
            </Typography>
            {selectedBudget.items ? (
              Array.isArray(selectedBudget.items) &&
              selectedBudget.items.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: "35vh" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                        >
                          Descripción
                        </TableCell>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                          align="center"
                        >
                          Cantidad
                        </TableCell>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                          align="center"
                        >
                          Precio
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
                      {selectedBudget.items.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="center">
                            {item.quantity + " " + item.unit}
                          </TableCell>
                          <TableCell align="center">
                            ${item.price.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No hay items en este presupuesto
                </Typography>
              )
            ) : (
              <Typography color="text.secondary">
                No se encontraron items
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ maxHeight: "72vh", overflow: "auto" }}>
          {customerBudgets.length > 0 ? (
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "primary.main", color: "white" }}
                      align="center"
                    >
                      Total
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "primary.main", color: "white" }}
                      align="center"
                    >
                      Estado
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
                  {customerBudgets.map((budget) => (
                    <TableRow key={budget.id} hover>
                      <TableCell>
                        {new Date(budget.date).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell align="center">
                        ${budget.total.toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={budget.status}
                          color={
                            budget.status === "aprobado"
                              ? "success"
                              : budget.status === "rechazado"
                              ? "error"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleViewBudgetItems(budget)}
                          size="small"
                          sx={{
                            borderRadius: "4px",
                            color: "primary.main",
                            "&:hover": {
                              backgroundColor: "primary.main",
                              color: "white",
                            },
                          }}
                          title="Ver detalles"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Assignment sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary">
                No hay presupuestos para este cliente
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Modal>
  );

  const SalesModal = () => (
    <Modal
      isOpen={isSalesModalOpen}
      onClose={() => {
        setIsSalesModalOpen(false);
        setSelectedCustomer(null);
        setCustomerSales([]);
      }}
      title={`Historial de Compras - ${selectedCustomer?.name || ""}`}
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={() => {
              setIsSalesModalOpen(false);
              setSelectedCustomer(null);
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
        </Box>
      }
    >
      <Box sx={{ maxHeight: "72vh", overflow: "auto" }}>
        {customerSales.length > 0 ? (
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Fecha
                  </TableCell>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Productos
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Total
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Estado
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      {sale.products.map((product, idx) => (
                        <Box key={idx} sx={{ fontSize: "0.875rem" }}>
                          {product.name} x {product.quantity}
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell align="center">
                      ${sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={sale.paid ? "Pagado" : "Pendiente"}
                        color={sale.paid ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Assignment sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
            <Typography color="text.secondary">
              No hay compras registradas para este cliente
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );

  const DeleteBudgetModal = () => (
    <Modal
      isOpen={isDeleteBudgetModalOpen}
      onClose={() => setIsDeleteBudgetModalOpen(false)}
      title="Eliminar Presupuesto"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={() => setIsDeleteBudgetModalOpen(false)}
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
            color="error"
            onClick={handleConfirmDeleteBudget}
            sx={{
              bgcolor: "error.main",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            Eliminar
          </Button>
        </Box>
      }
    >
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Delete sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }} />
        <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
          ¿¿Desea eliminar el presupuesto?
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
          El presupuesto <strong>{budgetToDelete?.name}</strong> será eliminado
          definitivamente.
        </Typography>
      </Box>
    </Modal>
  );

  const DeleteCustomerModal = () => (
    <Modal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      title="Eliminar Cliente"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={() => setIsDeleteModalOpen(false)}
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
            color="error"
            onClick={handleConfirmDelete}
            isPrimaryAction={true}
            sx={{
              bgcolor: "error.main",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            Sí, Eliminar
          </Button>
        </Box>
      }
    >
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Delete sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }} />
        <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
          ¿Desea eliminar el cliente?
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
          El cliente <strong>{customerToDelete?.name}</strong> será eliminado
          definitivamente.
        </Typography>
      </Box>
    </Modal>
  );

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
          Clientes
        </Typography>

        {/* Header con búsqueda y acciones - Estilo consistente */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <SearchBar onSearch={handleSearch} />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              width: "100%",
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsModalOpen(true)}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Nuevo Cliente
            </Button>
          </Box>
        </Box>

        {/* Tabla de clientes */}
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
              sx={{ maxHeight: "72vh", flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={getTableHeaderStyle()}>Nombre</TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Contacto
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Estado
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Saldo Pendiente
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Fecha de Registro
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((customer) => {
                      const pendingBalance =
                        getCustomerPendingBalance(customer);
                      const hasPendingBalance = pendingBalance > 0;

                      return (
                        <TableRow
                          key={customer.id}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { backgroundColor: "action.hover" },
                            transition: "all 0.3s",
                          }}
                        >
                          <TableCell>
                            <Box>
                              <Typography fontWeight="bold">
                                {customer.name}
                              </Typography>
                              {customer.cuitDni && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mt: 0.5,
                                  }}
                                >
                                  <Badge sx={{ fontSize: 12, mr: 0.5 }} />
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {customer.cuitDni}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              {customer.phone && (
                                <Typography>{customer.phone}</Typography>
                              )}
                              {customer.email && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Email sx={{ fontSize: 12, mr: 0.5 }} />
                                  <Typography variant="caption">
                                    {customer.email}
                                  </Typography>
                                </Box>
                              )}
                              {!customer.phone && !customer.email && (
                                <Typography
                                  color="text.secondary"
                                  variant="caption"
                                >
                                  Sin contacto
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={customer.status}
                              color={
                                customer.status === "activo"
                                  ? "success"
                                  : "error"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              fontWeight="bold"
                              color={
                                hasPendingBalance
                                  ? "error.main"
                                  : "success.main"
                              }
                            >
                              ${pendingBalance.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {new Date(customer.createdAt).toLocaleDateString(
                              "es-AR"
                            )}
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
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setIsBudgetsModalOpen(true);
                                  }}
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Ver presupuestos"
                                >
                                  <Assignment fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() =>
                                    handleViewPurchaseHistory(customer)
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
                                  title="Ver historial de compras"
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleEditClick(customer)}
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Editar cliente"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleDeleteClick(customer)}
                                  size="small"
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Eliminar cliente"
                                  disabled={hasPendingBalance}
                                >
                                  <Delete fontSize="small" />
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
                        colSpan={rubro !== "Todos los rubros" ? 6 : 5}
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
                          <Groups
                            sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                          />
                          <Typography>
                            {searchQuery
                              ? "No se encontraron clientes"
                              : "No hay clientes registrados"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredCustomers.length > 0 && (
            <Pagination
              text="Clientes por página"
              text2="Total de clientes"
              totalItems={filteredCustomers.length}
            />
          )}
        </Box>

        {/* Modal para agregar/editar cliente - Botones corregidos */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
            setNewCustomer({
              name: "",
              phone: "",
              email: "",
              address: "",
              cuitDni: "",
              status: "activo",
              pendingBalance: 0,
            });
          }}
          title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCustomer(null);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    cuitDni: "",
                    status: "activo",
                    pendingBalance: 0,
                  });
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
              <Button
                variant="contained"
                onClick={
                  editingCustomer ? handleUpdateCustomer : handleAddCustomer
                }
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingCustomer ? "Actualizar" : "Agregar"}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Input
                label="Nombre del cliente"
                value={newCustomer.name}
                onRawChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                placeholder="Ingrese el nombre completo"
                required
              />
              <Input
                label="Teléfono"
                value={newCustomer.phone || ""}
                onRawChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                placeholder="Ingrese el número de teléfono"
              />
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Input
                label="Email"
                type="email"
                value={newCustomer.email || ""}
                onRawChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                placeholder="Ingrese el email"
              />
              <Input
                label="CUIT/DNI"
                value={newCustomer.cuitDni || ""}
                onRawChange={(e) =>
                  setNewCustomer({ ...newCustomer, cuitDni: e.target.value })
                }
                placeholder="Ingrese CUIT o DNI"
              />
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <FormControl fullWidth>
                <Select
                  label="Estado"
                  value={newCustomer.status}
                  options={statusOptions}
                  onChange={(value) =>
                    setNewCustomer({
                      ...newCustomer,
                      status: value as "activo" | "inactivo",
                    })
                  }
                  fullWidth
                />
              </FormControl>
              <Input
                label="Dirección"
                value={newCustomer.address || ""}
                onRawChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                placeholder="Ingrese la dirección"
              />
            </Box>
          </Box>
        </Modal>

        {/* Modales de confirmación - CORREGIDOS para ser consistentes */}
        <DeleteBudgetModal />
        <DeleteCustomerModal />

        {/* Modales de Material-UI */}
        <BudgetsModal />
        <SalesModal />

        {/* REEMPLAZADO: Usar closeNotification del hook en lugar de la función local */}
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

export default ClientesPage;

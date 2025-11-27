"use client";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import { Product, Supplier, SupplierContact } from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { Plus, Trash, Edit, Truck, Package } from "lucide-react";
import Pagination from "@/app/components/Pagination";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import {
  IconButton, // ✅ Material UI IconButton
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
} from "@mui/material";
import Button from "@/app/components/Button";

const ProveedoresPage = () => {
  const { rubro } = useRubro();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const { currentPage, itemsPerPage } = usePagination();
  const [companyName, setCompanyName] = useState("");
  const [contacts, setContacts] = useState<SupplierContact[]>([
    { name: "", phone: "" },
  ]);
  const [lastVisit, setLastVisit] = useState<string | undefined>(undefined);
  const [nextVisit, setNextVisit] = useState<string | undefined>(undefined);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isProductAssignmentModalOpen, setIsProductAssignmentModalOpen] =
    useState(false);
  const [selectedSupplierForProducts, setSelectedSupplierForProducts] =
    useState<Supplier | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [supplierProductCounts, setSupplierProductCounts] = useState<{
    [supplierId: number]: number;
  }>({});

  const filteredAvailableProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(productSearchQuery))
  );
  const openProductAssignmentModal = async (supplier: Supplier) => {
    setSelectedSupplierForProducts(supplier);
    setProductSearchQuery("");
    setIsLoadingProducts(true);

    try {
      const [allProducts, assignedProductKeys] = await Promise.all([
        db.products.toArray(),
        db.supplierProducts
          .where("supplierId")
          .equals(supplier.id)
          .primaryKeys(),
      ]);
      const filteredProducts = allProducts.filter(
        (product) => rubro === "Todos los rubros" || product.rubro === rubro
      );

      const assignedProductIds = assignedProductKeys.map(
        ([, productId]) => productId
      );
      const assignedProds = filteredProducts.filter((p) =>
        assignedProductIds.includes(p.id)
      );
      const availableProds = filteredProducts.filter(
        (p) => !assignedProductIds.includes(p.id)
      );

      setAssignedProducts(assignedProds);
      setAvailableProducts(availableProds);
      setIsProductAssignmentModalOpen(true);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      showNotification("Error al cargar productos", "error");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const assignProduct = async (product: Product) => {
    if (!selectedSupplierForProducts) return;

    try {
      await db.supplierProducts.add({
        supplierId: selectedSupplierForProducts.id,
        productId: product.id,
      });

      await fetchSupplierProductCounts();
      setAssignedProducts((prev) => [...prev, product]);
      setAvailableProducts((prev) => prev.filter((p) => p.id !== product.id));
      setProductSearchQuery("");

      showNotification(`"${product.name}" asignado correctamente`, "success");
    } catch (error) {
      console.error("Error al asignar producto:", error);
      showNotification(`Error al asignar "${product.name}"`, "error");
    }
  };

  const unassignProduct = async (product: Product) => {
    if (!selectedSupplierForProducts) return;

    try {
      await db.supplierProducts
        .where("[supplierId+productId]")
        .equals([selectedSupplierForProducts.id, product.id])
        .delete();
      fetchSupplierProductCounts();
      setAssignedProducts((prev) => prev.filter((p) => p.id !== product.id));
      setAvailableProducts((prev) => [...prev, product]);

      showNotification(
        `"${product.name}" desasignado correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al desasignar producto:", error);
      showNotification(`Error al desasignar "${product.name}"`, "error");
    }
  };
  const fetchSupplierProductCounts = useCallback(
    async (currentSuppliers?: Supplier[]) => {
      const suppliersToUse = currentSuppliers || suppliers;

      if (suppliersToUse.length === 0) return;

      const allProducts = await db.products.toArray();
      const counts: { [supplierId: number]: number } = {};

      for (const supplier of suppliersToUse) {
        const productKeys = await db.supplierProducts
          .where("supplierId")
          .equals(supplier.id)
          .primaryKeys();

        const productIds = productKeys.map(([, productId]) => productId);
        const filteredProducts = allProducts.filter(
          (p) =>
            productIds.includes(p.id) &&
            (rubro === "Todos los rubros" ||
              p.rubro === rubro ||
              (supplier.rubro &&
                supplier.rubro.toLowerCase() === rubro.toLowerCase()))
        );

        counts[supplier.id] = filteredProducts.length;
      }

      setSupplierProductCounts(counts);
    },
    [rubro, suppliers]
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      const allSuppliers = await db.suppliers.toArray();
      const sortedSuppliers = [...allSuppliers].sort((a, b) =>
        a.companyName.localeCompare(b.companyName)
      );

      if (rubro === "Todos los rubros") {
        return sortedSuppliers;
      }

      const filtered = sortedSuppliers.filter((supplier) => {
        if (!supplier.rubro) return false;
        return supplier.rubro.toLowerCase() === rubro.toLowerCase();
      });

      return filtered;
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return [];
    }
  }, [rubro]);

  useEffect(() => {
    const fetchData = async () => {
      const filteredSuppliers = await fetchSuppliers();
      setSuppliers(filteredSuppliers);
      setFilteredSuppliers(filteredSuppliers);
      fetchSupplierProductCounts(filteredSuppliers);
    };
    fetchData();
  }, [rubro, fetchSuppliers, fetchSupplierProductCounts]);

  useEffect(() => {
    const filtered = suppliers.filter(
      (supplier) =>
        supplier.companyName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        supplier.contacts.some((contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);

  useEffect(() => {
    const updateCounts = async () => {
      await fetchSupplierProductCounts();
    };
    updateCounts();
  }, [suppliers, rubro, fetchSupplierProductCounts]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 2500);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const resetForm = () => {
    setCompanyName("");
    setContacts([{ name: "", phone: "" }]);
    setLastVisit(undefined);
    setNextVisit(undefined);
    setEditingSupplier(null);
  };

  const handleAddContact = () => {
    setContacts([...contacts, { name: "", phone: "" }]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    const newContacts = [...contacts];
    newContacts.splice(index, 1);
    setContacts(newContacts);
  };

  const handleContactChange = (
    index: number,
    field: keyof SupplierContact,
    value: string
  ) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      showNotification("El nombre de la empresa es requerido", "error");
      return;
    }
    if (contacts.some((contact) => !contact.name.trim())) {
      showNotification("Todos los proveedores deben tener un nombre", "error");
      return;
    }

    try {
      const supplierData: Omit<Supplier, "id"> = {
        companyName: companyName.trim(),
        contacts: contacts.map((contact) => ({
          name: contact.name.trim(),
          phone: contact.phone?.trim(),
        })),
        lastVisit: lastVisit || undefined,
        nextVisit: nextVisit || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
      };

      if (editingSupplier) {
        const updatedSupplier = {
          ...editingSupplier,
          ...supplierData,
          rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
        };
        await db.suppliers.update(editingSupplier.id, updatedSupplier);
        setSuppliers(
          suppliers.map((s) =>
            s.id === editingSupplier.id ? updatedSupplier : s
          )
        );
        showNotification("Proveedor actualizado correctamente", "success");
      } else {
        const id = await db.suppliers.add({
          ...supplierData,
          id: Date.now(),
        });
        const newSupplier = { ...supplierData, id };
        setSuppliers((prev) => [...prev, newSupplier]);
        setFilteredSuppliers((prev) => [...prev, newSupplier]);
        showNotification("Proveedor agregado correctamente", "success");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar proveedor:", error);
      showNotification("Error al guardar proveedor", "error");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setCompanyName(supplier.companyName);
    setContacts(
      supplier.contacts.length > 0
        ? supplier.contacts
        : [{ name: "", phone: "" }]
    );
    setLastVisit(supplier.lastVisit || undefined);
    setNextVisit(supplier.nextVisit || undefined);
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      await db.suppliers.delete(supplierToDelete.id);
      setSuppliers(suppliers.filter((s) => s.id !== supplierToDelete.id));
      showNotification("Proveedor eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      showNotification("Error al eliminar proveedor", "error");
    }
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSuppliers.slice(
    indexOfFirstItem,
    indexOfLastItem
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
          Proveedores
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ width: "100%", maxWidth: "400px" }}>
            <SearchBar onSearch={handleSearch} />
          </Box>
          {rubro !== "Todos los rubros" && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Nuevo Proveedor
            </Button>
          )}
        </Box>

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
                      Empresa
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Proveedores
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Última Visita
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Próxima Visita
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Productos
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
                  {currentItems.length > 0 ? (
                    currentItems.map((supplier) => (
                      <TableRow key={supplier.id} hover>
                        <TableCell className="capitalize font-semibold">
                          {supplier.companyName}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            {supplier.contacts.length > 0 && (
                              <Typography>
                                {supplier.contacts[0].name}
                              </Typography>
                            )}
                            {supplier.contacts.length > 1 && (
                              <Box
                                sx={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: "text.secondary",
                                    cursor: "pointer",
                                    "&:hover": { color: "text.primary" },
                                  }}
                                >
                                  +{supplier.contacts.length - 1} más
                                </Typography>
                                <Box
                                  sx={{
                                    position: "absolute",
                                    display: "none",
                                    zIndex: 10,
                                    width: "256px",
                                    p: 1,
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    boxShadow: 2,
                                    left: "100%",
                                    top: 0,
                                    ml: 1,
                                  }}
                                  className="group-hover:block"
                                >
                                  {supplier.contacts
                                    .slice(1)
                                    .map((contact, index) => (
                                      <Box key={index} sx={{ py: 0.5 }}>
                                        <Typography variant="body2">
                                          {contact.name}
                                        </Typography>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {supplier.lastVisit ? (
                            format(parseISO(supplier.lastVisit), "dd/MM/yyyy", {
                              locale: es,
                            })
                          ) : (
                            <Typography color="text.secondary">
                              No registrada
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {supplier.nextVisit ? (
                            format(parseISO(supplier.nextVisit), "dd/MM/yyyy", {
                              locale: es,
                            })
                          ) : (
                            <Typography color="text.secondary">
                              No programada
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {supplierProductCounts[supplier.id] || 0} productos
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
                                size="small"
                                onClick={() =>
                                  openProductAssignmentModal(supplier)
                                }
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                                title="Asignar productos"
                              >
                                <Package size={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(supplier)}
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                                title="Editar proveedor"
                              >
                                <Edit size={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => openDeleteModal(supplier)}
                                sx={{
                                  color: "text.secondary",
                                  "&:hover": {
                                    backgroundColor: "error.main",
                                    color: "white",
                                  },
                                }}
                                title="Eliminar proveedor"
                              >
                                <Trash size={18} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
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
                          <Truck
                            size={64}
                            style={{ marginBottom: 16, color: "#9CA3AF" }}
                          />
                          <Typography>
                            {searchQuery
                              ? "No hay proveedores que coincidan con la búsqueda"
                              : "No hay proveedores registrados"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredSuppliers.length > 0 && (
            <Pagination
              text="Proveedores por página"
              text2="Total de proveedores"
              totalItems={filteredSuppliers.length}
            />
          )}
        </Box>

        <Modal
          isOpen={isProductAssignmentModalOpen}
          onClose={() => {
            setIsProductAssignmentModalOpen(false);
            setProductSearchQuery("");
          }}
          title={`Productos de ${
            selectedSupplierForProducts?.companyName || ""
          }`}
          minheight="min-h-[75vh]"
          buttons={
            <Button
              variant="text"
              onClick={() => {
                setIsProductAssignmentModalOpen(false);
                setProductSearchQuery("");
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
          }
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight="medium">
                Buscar Productos
              </Typography>
              <Input
                placeholder="Buscar por nombre o código de barras"
                value={productSearchQuery}
                onRawChange={(e) => setProductSearchQuery(e.target.value)}
              />

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  height: "59.4vh",
                  overflow: "auto",
                }}
              >
                {isLoadingProducts ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "160px",
                    }}
                  >
                    <Box
                      sx={{
                        animation: "spin 1s linear infinite",
                        width: "48px",
                        height: "48px",
                        border: "2px solid",
                        borderColor: "primary.main transparent",
                        borderRadius: "50%",
                      }}
                    />
                  </Box>
                ) : filteredAvailableProducts.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {filteredAvailableProducts.map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          p: 1,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "action.hover" },
                          transition: "all 0.3s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {product.barcode || "Sin código"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2">
                              Stock: {product.stock} {product.unit}
                            </Typography>
                            <Typography variant="body2" fontWeight="semibold">
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ ml: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => assignProduct(product)}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              "&:hover": { bgcolor: "primary.dark" },
                              minWidth: "32px",
                              width: "32px",
                              height: "32px",
                            }}
                          >
                            <Plus size={18} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography color="text.secondary">
                      No hay productos disponibles
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="h6" fontWeight="medium">
                Productos asignados
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  height: "65vh",
                  overflow: "auto",
                }}
              >
                {assignedProducts.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {assignedProducts.map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          p: 1,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "action.hover" },
                          transition: "all 0.3s",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box>
                            <Typography fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Typography variant="body2">
                              {product.stock} {product.unit} •{" "}
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </Typography>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={() => unassignProduct(product)}
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              "&:hover": { bgcolor: "error.dark" },
                              minWidth: "32px",
                              width: "32px",
                              height: "32px",
                            }}
                          >
                            <Trash size={18} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography color="text.secondary">
                      No hay productos asignados
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingSupplier ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Input
              label="Nombre de la Empresa"
              value={companyName}
              onRawChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Distribuidora S.A."
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {contacts.map((contact, index) => (
                <Box
                  key={index}
                  sx={{
                    background:
                      "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "primary.light",
                    boxShadow: 1,
                    p: 3,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Chip
                      label={`Proveedor #${index + 1}`}
                      color="primary"
                      variant="filled"
                      sx={{ color: "white" }}
                    />
                    {contacts.length > 1 && (
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Trash size={18} />}
                        onClick={() => handleRemoveContact(index)}
                        size="small"
                        sx={{
                          bgcolor: "error.main",
                          "&:hover": { bgcolor: "error.dark" },
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Input
                      label="Nombre"
                      value={contact.name}
                      onRawChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                      placeholder="Nombre del proveedor"
                    />
                    <Input
                      label="Teléfono"
                      value={contact.phone}
                      onRawChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                      placeholder="Teléfono del proveedor"
                    />
                  </Box>
                </Box>
              ))}
              <Button
                startIcon={<Plus size={18} />}
                onClick={handleAddContact}
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    color: "primary.dark",
                    backgroundColor: "transparent",
                  },
                  alignSelf: "flex-start",
                }}
              >
                Agregar otro proveedor
              </Button>
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <CustomDatePicker
                label="Última Visita"
                placeholder="Seleccione una fecha"
                value={lastVisit || ""}
                onChange={setLastVisit}
                isClearable
              />
              <CustomDatePicker
                label="Próxima Visita"
                placeholder="Seleccione una fecha"
                value={nextVisit || ""}
                onChange={setNextVisit}
                isClearable
              />
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Proveedor"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Eliminar
              </Button>
              <Button
                variant="outlined"
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
            </Box>
          }
        >
          <Typography color="text.secondary">
            ¿Está seguro de que desea eliminar el proveedor{" "}
            <Typography component="span" fontWeight="semibold">
              {supplierToDelete?.companyName}
            </Typography>
            ? Esta acción no se puede deshacer.
          </Typography>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default ProveedoresPage;

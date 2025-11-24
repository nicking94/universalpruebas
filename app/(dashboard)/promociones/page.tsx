"use client";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  Promotion,
  PromotionType,
  PromotionStatus,
} from "@/app/lib/types/types";
import { Plus, Edit, Trash, Tag, Percent, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import {
  Button, // ✅ Material UI Button
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
  Card,
  CardContent,
} from "@mui/material";

const PromocionesPage = () => {
  const { rubro } = useRubro();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const { currentPage, itemsPerPage } = usePagination();

  const [newPromotion, setNewPromotion] = useState<
    Omit<Promotion, "id"> & { id?: number }
  >({
    name: "",
    description: "",
    type: "PERCENTAGE_DISCOUNT",
    status: "active",
    discount: 0,
    rubro: rubro,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    minPurchaseAmount: 0,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Opciones mejoradas
  const promotionTypeOptions = [
    {
      value: "PERCENTAGE_DISCOUNT",
      label: "Descuento Porcentual",
      icon: <Percent size={16} />,
    },
    {
      value: "FIXED_DISCOUNT",
      label: "Descuento Fijo",
      icon: <DollarSign size={16} />,
    },
  ];

  const statusOptions = [
    { value: "active", label: "Activa", color: "bg-green_xl text-green_b" },
    { value: "inactive", label: "Inactiva", color: "bg-gray_xl text-gray_b" },
  ];

  // Validación mejorada
  const validatePromotion = (promotion: typeof newPromotion): boolean => {
    const errors: Record<string, string> = {};

    if (!promotion.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    if (!promotion.discount || promotion.discount <= 0) {
      errors.discount = "El descuento debe ser mayor a 0";
    }

    if (promotion.type === "PERCENTAGE_DISCOUNT" && promotion.discount > 100) {
      errors.discount = "El descuento no puede ser mayor al 100%";
    }

    if (promotion.endDate && promotion.startDate > promotion.endDate) {
      errors.endDate = "La fecha de fin no puede ser anterior a la de inicio";
    }

    if (promotion.minPurchaseAmount && promotion.minPurchaseAmount < 0) {
      errors.minPurchaseAmount = "El monto mínimo no puede ser negativo";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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
    }, 3000);
  };

  const fetchPromotions = async () => {
    try {
      const storedPromotions = await db.promotions.toArray();
      const filtered =
        rubro === "Todos los rubros"
          ? storedPromotions
          : storedPromotions.filter((p) => p.rubro === rubro);

      const promotionsWithId = filtered.filter(
        (p): p is Promotion & { id: number } => !!p.id
      );

      // Ordenar por estado y fecha
      setPromotions(
        promotionsWithId.sort((a, b) => {
          if (a.status === b.status) {
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          }
          return a.status === "active" ? -1 : 1;
        })
      );
    } catch (error) {
      console.error("Error fetching promotions:", error);
      showNotification("Error al cargar promociones", "error");
    }
  };

  const handleAddPromotion = () => {
    setEditingPromotion(null);
    setValidationErrors({});
    setNewPromotion({
      name: "",
      description: "",
      type: "PERCENTAGE_DISCOUNT",
      status: "active",
      discount: 0,
      rubro: rubro,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      minPurchaseAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsOpenModal(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    if (!promotion.id) {
      showNotification("No se puede editar una promoción sin ID", "error");
      return;
    }

    setEditingPromotion(promotion);
    setValidationErrors({});
    setNewPromotion({
      ...promotion,
      updatedAt: new Date().toISOString(),
    });
    setIsOpenModal(true);
  };

  const handleConfirmAddPromotion = async () => {
    if (!validatePromotion(newPromotion)) {
      showNotification(
        "Por favor, corrige los errores en el formulario",
        "error"
      );
      return;
    }

    try {
      if (editingPromotion && editingPromotion.id) {
        await db.promotions.update(editingPromotion.id, newPromotion);
        showNotification("Promoción actualizada correctamente", "success");
      } else {
        await db.promotions.add(newPromotion as Promotion);
        showNotification("Promoción creada correctamente", "success");
      }

      await fetchPromotions();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving promotion:", error);
      showNotification("Error al guardar promoción", "error");
    }
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    if (!promotion.id) {
      showNotification("No se puede eliminar una promoción sin ID", "error");
      return;
    }

    setPromotionToDelete(promotion);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (promotionToDelete && promotionToDelete.id) {
      try {
        await db.promotions.delete(promotionToDelete.id);
        await fetchPromotions();
        showNotification("Promoción eliminada correctamente", "success");
      } catch (error) {
        console.error("Error deleting promotion:", error);
        showNotification("Error al eliminar promoción", "error");
      }
      setPromotionToDelete(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setEditingPromotion(null);
    setValidationErrors({});
  };

  const getPromotionStatus = (
    promotion: Promotion
  ): { label: string; color: string } => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

    if (promotion.status === "inactive") {
      return { label: "Inactiva", color: "bg-gray_xl text-gray_b" };
    }

    if (now < startDate) {
      return { label: "Programada", color: "bg-blue_xl text-blue_b" };
    }

    if (endDate && now > endDate) {
      return { label: "Expirada", color: "bg-red_xl text-red_b" };
    }

    return { label: "Activa", color: "bg-green_xl text-green_b" };
  };

  useEffect(() => {
    fetchPromotions();
  }, [rubro]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPromotions = promotions.slice(indexOfFirstItem, indexOfLastItem);

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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" fontWeight="semibold">
            Promociones
          </Typography>
          {rubro !== "Todos los rubros" && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={handleAddPromotion}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Nueva Promoción
            </Button>
          )}
        </Box>

        {/* Estadísticas rápidas */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            mb: 3,
          }}
        >
          <Card
            sx={{ boxShadow: 1, border: "1px solid", borderColor: "divider" }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Promociones
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {promotions.length}
                  </Typography>
                </Box>
                <Tag className="text-blue_m" size={24} />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ boxShadow: 1, border: "1px solid", borderColor: "divider" }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Activas
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {
                      promotions.filter(
                        (p) => getPromotionStatus(p).label === "Activa"
                      ).length
                    }
                  </Typography>
                </Box>
                <Tag className="text-green_m" size={24} />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ boxShadow: 1, border: "1px solid", borderColor: "divider" }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Expiradas
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {
                      promotions.filter(
                        (p) => getPromotionStatus(p).label === "Expirada"
                      ).length
                    }
                  </Typography>
                </Box>
                <Tag className="text-red_m" size={24} />
              </Box>
            </CardContent>
          </Card>
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
              sx={{ maxHeight: "calc(100vh - 350px)", flex: 1 }}
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
                      Nombre
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Tipo
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Descuento
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Estado
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Vigencia
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
                  {currentPromotions.length > 0 ? (
                    currentPromotions.map((promotion) => {
                      const statusInfo = getPromotionStatus(promotion);
                      return (
                        <TableRow
                          key={promotion.id || `promo-${promotion.createdAt}`}
                          hover
                        >
                          <TableCell>
                            <Box>
                              <Typography
                                fontWeight="bold"
                                sx={{ textTransform: "uppercase" }}
                              >
                                {promotion.name}
                              </Typography>
                              {promotion.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, display: "block" }}
                                >
                                  {promotion.description}
                                </Typography>
                              )}
                            </Box>
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
                              {
                                promotionTypeOptions.find(
                                  (t) => t.value === promotion.type
                                )?.icon
                              }
                              <Typography variant="body2">
                                {
                                  promotionTypeOptions.find(
                                    (t) => t.value === promotion.type
                                  )?.label
                                }
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="bold">
                              {promotion.type === "FIXED_DISCOUNT" && "$"}
                              {promotion.discount}
                              {promotion.type === "PERCENTAGE_DISCOUNT" && "%"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={statusInfo.label}
                              color={
                                statusInfo.label === "Activa"
                                  ? "success"
                                  : statusInfo.label === "Expirada"
                                  ? "error"
                                  : statusInfo.label === "Programada"
                                  ? "primary"
                                  : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
                              <Typography variant="caption">
                                Inicio:{" "}
                                {new Date(
                                  promotion.startDate
                                ).toLocaleDateString()}
                              </Typography>
                              {promotion.endDate && (
                                <Typography variant="caption">
                                  Fin:{" "}
                                  {new Date(
                                    promotion.endDate
                                  ).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
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
                                  onClick={() => handleEditPromotion(promotion)}
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Editar promoción"
                                >
                                  <Edit size={18} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleDeletePromotion(promotion)
                                  }
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "white",
                                    },
                                  }}
                                  title="Eliminar promoción"
                                >
                                  <Trash size={18} />
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
                          <Tag
                            size={64}
                            style={{ marginBottom: 16, color: "#9CA3AF" }}
                          />
                          <Typography>Todavía no hay promociones.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {promotions.length > 0 && (
            <Pagination
              text="Promociones por página"
              text2="Total de promociones"
              totalItems={promotions.length}
            />
          )}
        </Box>

        {/* Modal de Promoción Mejorado */}
        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title={editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleConfirmAddPromotion}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingPromotion ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="outlined"
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
          <Box sx={{ p: 0.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Input
                    label="Nombre de la promoción*"
                    type="text"
                    value={newPromotion.name}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Descuento de Verano 20%"
                  />
                  {validationErrors.name && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.name}
                    </Typography>
                  )}
                </Box>

                <Input
                  label="Descripción"
                  type="text"
                  value={newPromotion.description}
                  onRawChange={(e) =>
                    setNewPromotion((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Breve descripción de la promoción"
                />
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Tipo de Promoción*
                  </Typography>
                  <Select
                    options={promotionTypeOptions}
                    value={promotionTypeOptions.find(
                      (t) => t.value === newPromotion.type
                    )}
                    onChange={(selected) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        type: selected?.value as PromotionType,
                        discount: 0, // Reset discount when type changes
                      }))
                    }
                    className="text-gray_m"
                    formatOptionLabel={(option) => (
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    )}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Descuento a Aplicar*
                  </Typography>
                  <Input
                    type="number"
                    value={newPromotion.discount?.toString() || "0"}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder={
                      newPromotion.type === "PERCENTAGE_DISCOUNT"
                        ? "Porcentaje %"
                        : "Monto fijo $"
                    }
                    step={
                      newPromotion.type === "PERCENTAGE_DISCOUNT" ? "1" : "0.01"
                    }
                  />
                  {validationErrors.discount && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.discount}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Fecha de Inicio*
                  </Typography>
                  <Input
                    type="date"
                    value={newPromotion.startDate}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Fecha de Fin (Opcional)
                  </Typography>
                  <Input
                    type="date"
                    value={newPromotion.endDate || ""}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                  {validationErrors.endDate && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.endDate}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Estado*
                  </Typography>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find(
                      (s) => s.value === newPromotion.status
                    )}
                    onChange={(selected) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        status: selected?.value as PromotionStatus,
                      }))
                    }
                    className="text-gray_m"
                  />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="semibold"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Monto Mínimo de Compra (Opcional)
                  </Typography>
                  <Input
                    type="number"
                    value={newPromotion.minPurchaseAmount?.toString() || "0"}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        minPurchaseAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0 = sin mínimo"
                    step="0.01"
                  />
                  {validationErrors.minPurchaseAmount && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.minPurchaseAmount}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Promoción"
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
                Sí, eliminar
              </Button>
              <Button
                variant="outlined"
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
                Cancelar
              </Button>
            </Box>
          }
        >
          <Box sx={{ textAlign: "center" }}>
            <Trash
              size={48}
              style={{ margin: "0 auto 16px", color: "#EF4444" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro que desea eliminar la promoción?
            </Typography>
            <Typography color="text.secondary">
              {promotionToDelete?.name} será eliminada permanentemente.
            </Typography>
          </Box>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default PromocionesPage;

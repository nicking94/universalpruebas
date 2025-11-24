import { formatCurrency } from "../lib/utils/currency";
import { Budget, PaymentSplit, PaymentMethod } from "../lib/types/types";
import { useState } from "react";
import Modal from "./Modal";
import InputCash from "./InputCash";

// Material-UI imports
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Button,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface ConvertToSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  onConfirm: (paymentMethods: PaymentSplit[]) => void;
}

const paymentOptions = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
];

export const ConvertToSaleModal = ({
  isOpen,
  onClose,
  budget,
  onConfirm,
}: ConvertToSaleModalProps) => {
  const totalToPay =
    budget.total - (budget.deposit ? parseFloat(budget.deposit) : 0);

  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: totalToPay },
  ]);

  const [error, setError] = useState<string>("");

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setError("");
    setPaymentMethods((prev) => {
      const updated = [...prev];

      if (field === "amount") {
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
            : value;

        updated[index] = {
          ...updated[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };

        if (updated.length === 2) {
          const otherIndex = index === 0 ? 1 : 0;
          const remaining = totalToPay - numericValue;
          updated[otherIndex] = {
            ...updated[otherIndex],
            amount: parseFloat(Math.max(0, remaining).toFixed(2)),
          };
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

  const addPaymentMethod = () => {
    if (paymentMethods.length >= paymentOptions.length) return;

    setPaymentMethods((prev) => {
      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = totalToPay / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: share,
          },
        ];
      } else {
        return [
          ...prev,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: 0,
          },
        ];
      }
    });
  };

  const removePaymentMethod = (index: number) => {
    if (paymentMethods.length <= 1) return;

    setPaymentMethods((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);

      if (updated.length === 1) {
        updated[0].amount = totalToPay;
      } else {
        const share = totalToPay / updated.length;
        updated.forEach((m, i) => {
          updated[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return updated;
    });
  };

  const validatePaymentMethods = (): boolean => {
    const sum = paymentMethods.reduce(
      (acc, method) => acc + parseFloat(method.amount.toFixed(2)),
      0
    );
    const isValid = Math.abs(sum - parseFloat(totalToPay.toFixed(2))) < 0.01;

    if (!isValid) {
      setError(
        `La suma de los montos (${formatCurrency(
          sum
        )}) no coincide con el total a pagar (${formatCurrency(totalToPay)})`
      );
    }

    return isValid;
  };

  const handleConfirm = () => {
    if (!validatePaymentMethods()) {
      return;
    }
    onConfirm(paymentMethods);
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case "EFECTIVO":
        return "success";
      case "TRANSFERENCIA":
        return "primary";
      case "TARJETA":
        return "secondary";
      default:
        return "default";
    }
  };

  const totalAmount = paymentMethods.reduce(
    (sum, method) => sum + method.amount,
    0
  );
  const amountDifference = totalAmount - totalToPay;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cobrar presupuesto de ${budget.customerName}`}
      buttons={
        <>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              backgroundColor: "#3b82f6",
              "&:hover": {
                backgroundColor: "#2563eb",
              },
            }}
          >
            Confirmar Cobro
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              color: "#6b7280",
              borderColor: "#d1d5db",
              "&:hover": {
                backgroundColor: "#f3f4f6",
                borderColor: "#9ca3af",
              },
            }}
          >
            Cancelar
          </Button>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Productos del presupuesto */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            fontWeight="medium"
          >
            Productos del presupuesto
          </Typography>

          <TableContainer sx={{ maxHeight: 200, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem" }}>
                    Producto
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                  >
                    Cantidad
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                  >
                    Descuento
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                  >
                    Subtotal
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budget.items.map((item, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.productName}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          {item.size && (
                            <Chip
                              label={item.size}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {item.color && (
                            <Chip
                              label={item.color}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.discount || 0}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(
                          item.price *
                            item.quantity *
                            (1 - (item.discount || 0) / 100)
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1,
              }}
            >
              <Typography variant="body1" fontWeight="medium">
                Seña:
              </Typography>
              <Typography variant="h6">
                {formatCurrency(
                  budget.deposit ? parseFloat(budget.deposit) : 0
                )}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Total a pagar:
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {formatCurrency(totalToPay)}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Métodos de pago */}
        <Box>
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            fontWeight="medium"
          >
            Métodos de pago
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {paymentMethods.map((method, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <FormControl sx={{ minWidth: 140 }} size="small">
                  <InputLabel>Método</InputLabel>
                  <Select
                    value={method.method}
                    label="Método"
                    onChange={(e) =>
                      handlePaymentMethodChange(index, "method", e.target.value)
                    }
                  >
                    {paymentOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ flex: 1, position: "relative" }}>
                  <InputCash
                    value={method.amount}
                    onChange={(value) =>
                      handlePaymentMethodChange(index, "amount", value)
                    }
                    label="Monto"
                  />

                  {index === paymentMethods.length - 1 &&
                    amountDifference > 0.1 && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{
                          ml: 1,
                          position: "absolute",
                          bottom: -20,
                          left: 0,
                        }}
                      >
                        Exceso: {formatCurrency(amountDifference)}
                      </Typography>
                    )}
                </Box>

                {paymentMethods.length > 1 && (
                  <IconButton
                    onClick={() => removePaymentMethod(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          {paymentMethods.length < paymentOptions.length && (
            <Button
              onClick={addPaymentMethod}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
            >
              Agregar otro método de pago
            </Button>
          )}

          {/* Resumen de montos */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Resumen de pagos:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {paymentMethods.map((method, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Chip
                    label={
                      paymentOptions.find((o) => o.value === method.method)
                        ?.label
                    }
                    size="small"
                    color={getPaymentMethodColor(method.method)}
                    variant="outlined"
                  />
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(method.amount)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Total:
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  color={
                    Math.abs(totalAmount - totalToPay) < 0.01
                      ? "success.main"
                      : "error.main"
                  }
                >
                  {formatCurrency(totalAmount)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Modal>
  );
};

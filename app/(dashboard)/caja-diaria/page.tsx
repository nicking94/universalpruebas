"use client";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  DailyCash,
  DailyCashMovement,
  Option,
  PaymentMethod,
  Supplier,
} from "@/app/lib/types/types";
import { Plus, Info, X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import Input from "@/app/components/Input";

const CajaDiariaPage = () => {
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] =
    useState<DailyCashMovement | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayMovements, setSelectedDayMovements] = useState<
    DailyCashMovement[]
  >([]);
  const [isOpenCashModal, setIsOpenCashModal] = useState(false);
  const [isCloseCashModal, setIsCloseCashModal] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  const [actualCashCount, setActualCashCount] = useState("");
  const [filterType, setFilterType] = useState<"TODOS" | "INGRESO" | "EGRESO">(
    "TODOS"
  );
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<
    PaymentMethod | "TODOS"
  >("TODOS");

  //pruebas
  const [dailyCashToDelete, setDailyCashToDelete] = useState<DailyCash | null>(
    null
  );
  const [isDeleteCashModalOpen, setIsDeleteCashModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<{
    value: number;
    label: string;
  } | null>(null);

  const deleteDailyCash = async () => {
    if (!dailyCashToDelete) return;

    try {
      await db.dailyCashes.delete(dailyCashToDelete.id);

      setDailyCashes((prev) =>
        prev.filter((dc) => dc.id !== dailyCashToDelete.id)
      );
      if (currentDailyCash && currentDailyCash.id === dailyCashToDelete.id) {
        setCurrentDailyCash(null);
      }

      setIsDeleteCashModalOpen(false);
      showNotification("Caja eliminada correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar caja:", error);
      showNotification("Error al eliminar caja", "error");
    }
  };
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [movementType, setMovementType] = useState<"INGRESO" | "EGRESO">(
    "INGRESO"
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  type MovementType = "INGRESO" | "EGRESO";

  const movementTypes: Option[] = [
    { value: "INGRESO", label: "Ingreso" },
    { value: "EGRESO", label: "Egreso" },
  ];

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];
  const getFilteredMovements = () => {
    return selectedDayMovements.filter((movement) => {
      const typeMatch = filterType === "TODOS" || movement.type === filterType;
      const paymentMatch =
        filterPaymentMethod === "TODOS" ||
        movement.paymentMethod === filterPaymentMethod;
      return typeMatch && paymentMatch;
    });
  };

  const calculateFilteredTotals = () => {
    const filtered = getFilteredMovements();
    return {
      totalIngresos: filtered
        .filter((m) => m.type === "INGRESO")
        .reduce((sum, m) => sum + m.amount, 0),
      totalEgresos: filtered
        .filter((m) => m.type === "EGRESO")
        .reduce((sum, m) => sum + m.amount, 0),
    };
  };

  const openDetailModal = (movements: DailyCashMovement[]) => {
    setSelectedDayMovements(movements);
    setIsDetailModalOpen(true);
  };

  const monthOptions = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const checkCashStatus = async () => {
    const today = new Date().toISOString().split("T")[0];
    const dailyCash = await db.dailyCashes.get({ date: today });

    if (!dailyCash) {
      setIsOpenCashModal(true);
      return false;
    } else if (!dailyCash.closed) {
      return true;
    } else {
      showNotification("La caja ya fue cerrada hoy", "info");
      return false;
    }
  };

  const openCash = async () => {
    if (!initialAmount) {
      showNotification("Debe ingresar un monto inicial", "error");
      return;
    }

    const initialAmountNumber = parseFloat(initialAmount);
    if (isNaN(initialAmountNumber)) {
      showNotification("El monto inicial debe ser un número válido", "error");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyCash: DailyCash = {
        id: Date.now(),
        date: today,
        initialAmount: initialAmountNumber,
        movements: [],
        closed: false,
        totalIncome: 0,
        totalExpense: 0,
      };

      await db.dailyCashes.add(dailyCash);
      setDailyCashes((prev) => [...prev, dailyCash]);
      setCurrentDailyCash(dailyCash);
      setIsOpenCashModal(false);
      setInitialAmount("");
      showNotification("Caja abierta correctamente", "success");
    } catch (error) {
      console.error("Error al abrir caja:", error);
      showNotification("Error al abrir caja", "error");
    }
  };

  const closeCash = async () => {
    if (!actualCashCount) {
      showNotification("Debe ingresar el monto real contado", "error");
      return;
    }

    const actualCashCountNumber = parseFloat(actualCashCount);
    if (isNaN(actualCashCountNumber)) {
      showNotification("El monto contado debe ser un número válido", "error");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const cashIncome = dailyCash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);
        const cashExpense = dailyCash.movements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        const expectedAmount =
          dailyCash.initialAmount + cashIncome - cashExpense;
        const difference = actualCashCountNumber - expectedAmount;

        const updatedCash = {
          ...dailyCash,
          closed: true,
          closingAmount: actualCashCountNumber,
          cashIncome,
          cashExpense,
          otherIncome: dailyCash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          closingDifference: difference,
          closingDate: new Date().toISOString(),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        setIsCloseCashModal(false);
        setActualCashCount("");
        showNotification("Caja cerrada correctamente", "success");
      }
    } catch (error) {
      console.error("Error al cerrar caja:", error);
      showNotification("Error al cerrar caja", "error");
    }
  };

  const getDailySummary = () => {
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
        initialAmount?: number;
        closingAmount?: number;
        closingDifference?: number;
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
          movements: [],
          closed: dailyCash.closed || false,
          initialAmount: dailyCash.initialAmount,
          closingAmount: dailyCash.closingAmount,
          closingDifference: dailyCash.closingDifference,
        };
      }

      movements.forEach((movement) => {
        summary[date].movements.push(movement);
        if (movement.type === "INGRESO") {
          summary[date].ingresos += movement.amount;
          if (movement.profit) {
            summary[date].gananciaNeta += movement.profit;
          }
        } else {
          summary[date].egresos += movement.amount;
        }
      });

      summary[date].ganancia = summary[date].ingresos - summary[date].egresos;
    });

    if (currentDailyCash) {
      const today = new Date().toISOString().split("T")[0];
      if (!summary[today]) {
        summary[today] = {
          date: today,
          ingresos: 0,
          egresos: 0,
          ganancia: 0,
          gananciaNeta: 0,
          movements: currentDailyCash.movements,
          closed: currentDailyCash.closed || false,
          initialAmount: currentDailyCash.initialAmount,
          closingAmount: currentDailyCash.closingAmount,
          closingDifference: currentDailyCash.closingDifference,
        };
      }
    }

    return Object.values(summary)
      .filter((item) => {
        const date = parseISO(item.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getMonthlySummary = () => {
    const dailySummaries = getDailySummary();

    return dailySummaries.reduce(
      (acc, day) => ({
        ingresos: acc.ingresos + day.ingresos,
        egresos: acc.egresos + day.egresos,
        ganancia: acc.ganancia + day.ganancia,
        gananciaNeta: acc.gananciaNeta + (day.gananciaNeta || 0),
      }),
      { ingresos: 0, egresos: 0, ganancia: 0, gananciaNeta: 0 }
    );
  };

  const dailySummaries = getDailySummary();
  const monthlySummary = getMonthlySummary();
  const addMovement = async () => {
    if (!amount) {
      showNotification("Debe haber un monto", "error");
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) {
      showNotification("El monto debe ser un número válido", "error");
      return;
    }

    const isCashOpen = await checkCashStatus();
    if (!isCashOpen) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        showNotification("La caja no está abierta", "error");
        return;
      }

      if (!paymentMethod) {
        throw new Error("El método de pago es obligatorio.");
      }

      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: amountNumber,
        description,
        type: movementType,
        paymentMethod,
        date: new Date().toISOString(),
        supplierId: selectedSupplier?.value,
        supplierName: selectedSupplier?.label,
      };

      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, movement],
        totalIncome:
          movementType === "INGRESO"
            ? (dailyCash.totalIncome || 0) + amountNumber
            : dailyCash.totalIncome,
        totalExpense:
          movementType === "EGRESO"
            ? (dailyCash.totalExpense || 0) + amountNumber
            : dailyCash.totalExpense,
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      setDailyCashes((prev) =>
        prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
      );
      setCurrentDailyCash(updatedCash);

      setAmount("");
      setDescription("");
      setMovementType("INGRESO");
      setPaymentMethod("EFECTIVO");
      setIsOpenModal(false);
      showNotification("Movimiento registrado correctamente", "success");
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      showNotification("Error al registrar movimiento", "error");
    }
  };
  const handleDeleteMovement = async () => {
    if (!movementToDelete) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const updatedMovements = dailyCash.movements.filter(
          (m) => m.id !== movementToDelete.id
        );

        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          totalIncome:
            movementToDelete.type === "INGRESO"
              ? (dailyCash.totalIncome || 0) - movementToDelete.amount
              : dailyCash.totalIncome,
          totalExpense:
            movementToDelete.type === "EGRESO"
              ? (dailyCash.totalExpense || 0) - movementToDelete.amount
              : dailyCash.totalExpense,
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);

        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        setSelectedDayMovements(updatedMovements);

        setIsConfirmModalOpen(false);
        showNotification("Movimiento eliminado correctamente", "success");
      }
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
      showNotification("Error al eliminar movimiento", "error");
    }
  };
  useEffect(() => {
    const fetchSuppliers = async () => {
      const allSuppliers = await db.suppliers.toArray();
      setSuppliers(allSuppliers);
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedDailyCashes = await db.dailyCashes.toArray();
        setDailyCashes(storedDailyCashes);

        const today = new Date().toISOString().split("T")[0];
        const todayCash = storedDailyCashes.find((dc) => dc.date === today);
        setCurrentDailyCash(todayCash || null);

        if (!todayCash) {
          setIsOpenCashModal(true);
        }
      } catch (error) {
        console.error("Error al cargar cajas diarias:", error);
        showNotification("Error al cargar cajas diarias", "error");
      }
    };

    fetchData();
  }, []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dailySummaries.slice(indexOfFirstItem, indexOfLastItem);
  const DetailModal = () => {
    const filteredMovements = getFilteredMovements();
    const { totalIngresos, totalEgresos } = calculateFilteredTotals();

    const handleDeleteClick = (movement: DailyCashMovement) => {
      setMovementToDelete(movement);
      setIsConfirmModalOpen(true);
    };

    return (
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalles del Día"
      >
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-green-100 p-3 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Ingresos</h3>
            <p className="text-xl font-bold text-green-800">
              {formatCurrency(totalIngresos)}
            </p>
          </div>
          <div className="bg-red-100 p-3 rounded-lg">
            <h3 className="font-semibold text-red-800">Total Egresos</h3>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency(totalEgresos)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray_b dark:text-white mb-1">
              Tipo
            </label>
            <Select
              options={[
                { value: "TODOS", label: "Todos" },
                { value: "INGRESO", label: "Ingresos" },
                { value: "EGRESO", label: "Egresos" },
              ]}
              value={{
                value: filterType,
                label:
                  filterType === "TODOS"
                    ? "Todos"
                    : filterType === "INGRESO"
                    ? "Ingresos"
                    : "Egresos",
              }}
              onChange={(option) =>
                option &&
                setFilterType(option.value as "TODOS" | "INGRESO" | "EGRESO")
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray_b dark:text-white mb-1">
              Método de Pago
            </label>
            <Select
              options={[{ value: "TODOS", label: "Todos" }, ...paymentMethods]}
              value={
                filterPaymentMethod === "TODOS"
                  ? { value: "TODOS", label: "Todos" }
                  : paymentMethods.find((m) => m.value === filterPaymentMethod)
              }
              onChange={(option) =>
                option &&
                setFilterPaymentMethod(option.value as PaymentMethod | "TODOS")
              }
              className="w-full"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((movement, index) => (
                  <tr
                    key={index}
                    className={movement.type === "EGRESO" ? "bg-red-50 " : ""}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          movement.type === "INGRESO"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {movement.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {movement.paymentMethod}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {movement.productName ||
                        (movement.type === "EGRESO" ? "Egreso" : "Varios")}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {movement.quantity
                        ? `${movement.quantity} ${movement.unit || ""}`
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm font-medium ${
                        movement.type === "INGRESO"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(movement.amount)}
                    </td>
                    <td className=" px-4 py-2 text-sm text-gray-500">
                      {movement.description || "-"}
                    </td>
                    <td className="flex justify-center items-center px-4 py-2 whitespace-nowrap text-sm">
                      <Button
                        text="Eliminar"
                        colorText="text-white"
                        colorTextHover="hover:text-white"
                        colorBg="bg-red-500"
                        colorBgHover="hover:bg-red-700"
                        onClick={() => handleDeleteClick(movement)}
                      ></Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray_m">
                    No hay movimientos que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            text="Cerrar"
            colorText="text-gray_b dark:text-white"
            colorTextHover="hover:text-white hover:dark:text-white"
            colorBg="bg-gray_xl dark:bg-gray_m"
            colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
            onClick={() => {
              setIsDetailModalOpen(false);
              setFilterType("TODOS");
              setFilterPaymentMethod("TODOS");
            }}
          />
        </div>
      </Modal>
    );
  };
  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Caja Diaria</h1>
        {currentDailyCash ? (
          <div
            className={`p-3 rounded-lg mb-4 ${
              currentDailyCash.closed ? "bg-gray-200" : "bg-green-100"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="text-gray_m font-semibold">
                <h3>
                  {currentDailyCash.closed ? "Caja Cerrada" : "Caja Abierta"}
                </h3>
                <p>
                  Fecha: {format(parseISO(currentDailyCash.date), "dd/MM/yyyy")}
                </p>
                <p>
                  Monto inicial:{" "}
                  {formatCurrency(currentDailyCash.initialAmount)}
                </p>
                {!currentDailyCash.closed ? (
                  <>
                    <p>
                      Ingresos en efectivo:{" "}
                      {formatCurrency(
                        currentDailyCash.movements
                          .filter(
                            (m) =>
                              m.type === "INGRESO" &&
                              m.paymentMethod === "EFECTIVO"
                          )
                          .reduce((sum, m) => sum + m.amount, 0)
                      )}
                    </p>
                    <p>
                      Otros ingresos:{" "}
                      {formatCurrency(
                        currentDailyCash.movements
                          .filter(
                            (m) =>
                              m.type === "INGRESO" &&
                              m.paymentMethod !== "EFECTIVO"
                          )
                          .reduce((sum, m) => sum + m.amount, 0)
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Ingresos en efectivo:{" "}
                      {formatCurrency(currentDailyCash.cashIncome || 0)}
                    </p>
                    <p>
                      Otros ingresos:{" "}
                      {formatCurrency(currentDailyCash.otherIncome || 0)}
                    </p>
                    <p>
                      Egresos:{" "}
                      {formatCurrency(currentDailyCash.cashExpense || 0)}
                    </p>
                    <p className="font-semibold">
                      Monto esperado (solo efectivo):{" "}
                      {formatCurrency(
                        currentDailyCash.initialAmount +
                          (currentDailyCash.cashIncome || 0) -
                          (currentDailyCash.cashExpense || 0)
                      )}
                    </p>
                    <p>
                      Efectivo contado:{" "}
                      {formatCurrency(currentDailyCash.closingAmount || 0)}
                    </p>
                    <p
                      className={`font-bold ${
                        (currentDailyCash.closingDifference || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Diferencia:{" "}
                      {formatCurrency(currentDailyCash.closingDifference || 0)}
                    </p>
                  </>
                )}
              </div>
              {!currentDailyCash.closed && (
                <Button
                  icon={<X />}
                  text="Cerrar Caja"
                  colorText="text-white"
                  colorTextHover="text-white"
                  colorBg="bg-red-500"
                  colorBgHover="hover:bg-red-700"
                  onClick={() => setIsCloseCashModal(true)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg mb-4 space-y-2">
            <p className="text-gray_m">No hay caja abierta para hoy</p>
            <Button
              text="Abrir Caja"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => setIsOpenCashModal(true)}
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {" "}
          <div className="bg-green-100 text-green-800 p-4 rounded-lg">
            <h3 className="font-bold">Ingresos Totales</h3>
            <p className="text-2xl">
              {formatCurrency(monthlySummary.ingresos)}
            </p>
          </div>
          <div className="bg-red-100 text-red-800 p-4 rounded-lg">
            <h3 className="font-bold">Egresos Totales</h3>
            <p className="text-2xl">{formatCurrency(monthlySummary.egresos)}</p>
          </div>
          <div className="bg-purple-100 text-purple-800 p-4 rounded-lg">
            <h3 className="font-bold">Ganancia</h3>
            <p className="text-2xl">
              {formatCurrency(monthlySummary.gananciaNeta || 0)}
            </p>
          </div>
        </div>
        <div className="flex justify-between mb-4">
          <div className="flex gap-4">
            <Select
              options={monthOptions}
              value={monthOptions.find((m) => m.value === selectedMonth)}
              onChange={(option) => option && setSelectedMonth(option.value)}
              className="w-40"
            />
            <Select
              options={yearOptions}
              value={yearOptions.find((y) => y.value === selectedYear)}
              onChange={(option) => option && setSelectedYear(option.value)}
              className="w-28"
            />
          </div>
          <Button
            icon={<Plus />}
            text="Nuevo Movimiento"
            colorText="text-white"
            colorTextHover="text-white"
            onClick={async () => {
              const isCashOpen = await checkCashStatus();
              if (isCashOpen) setIsOpenModal(true);
            }}
          />
        </div>
        <div
          className={`flex flex-col justify-between ${
            currentDailyCash?.closed
              ? "h-[calc(47vh-80px)]"
              : "h-[calc(53vh-40px)]"
          }`}
        >
          <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="text-xs xl:text-lg px-4 py-2">Fecha</th>
                <th className="text-xs xl:text-lg px-4 py-2">Ingresos</th>
                <th className="text-xs xl:text-lg px-4 py-2">Egresos</th>
                <th className="text-xs xl:text-lg px-4 py-2">Ganancia</th>
                <th className="text-xs xl:text-lg px-4 py-2">
                  Estado de caja
                </th>{" "}
                <th className="text-xs xl:text-lg px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white text-gray_b divide-y divide-gray_l">
              {currentItems.length > 0 ? (
                currentItems.map((day, index) => (
                  <tr
                    key={index}
                    className="text-xs 2xl:text-[.9rem] bg-white text-gray_b border-b border-gray_l"
                  >
                    <td className="font-semibold px-4 py-2 border border-gray_l">
                      {format(parseISO(day.date), "dd/MM/yyyy")}
                    </td>
                    <td className="font-semibold text-green-600 px-4 py-2 border border-gray_l">
                      {formatCurrency(day.ingresos)}
                    </td>
                    <td className="font-semibold text-red-600 px-4 py-2 border border-gray_l">
                      {formatCurrency(day.egresos)}
                    </td>
                    <td className="font-semibold text-purple-600 px-4 py-2 border border-gray_l">
                      {formatCurrency(day.gananciaNeta || 0)}
                    </td>
                    <td className="px-4 py-2 border border-gray_l">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          day.closed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {day.closed ? "Cerrada" : "Abierta"}
                      </span>
                    </td>
                    <td className="px-4 py-2 border border-gray_l flex justify-center gap-2">
                      <Button
                        text="Detalles"
                        colorText="text-gray_b"
                        colorTextHover="hover:text-white"
                        colorBg="bg-transparent"
                        colorBgHover="hover:bg-blue_m"
                        onClick={() => openDetailModal(day.movements)}
                      />
                      <Button
                        text="Eliminar"
                        colorText="text-white"
                        colorTextHover="hover:text-white"
                        colorBg="bg-red-500"
                        colorBgHover="hover:bg-red-700"
                        onClick={() => {
                          const cashToDelete = dailyCashes.find(
                            (dc) => dc.date === day.date
                          );
                          if (cashToDelete) {
                            setDailyCashToDelete(cashToDelete);
                            setIsDeleteCashModalOpen(true);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="h-[55vh] 2xl:h-[calc(54vh-80px)]">
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <Info size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">
                        No hay registros para el período seleccionado.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            text="Días por página"
            text2="Total de días"
            currentPage={currentPage}
            totalItems={dailySummaries.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        </div>
        <Modal
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
          title="Nuevo Movimiento"
        >
          <div className="flex flex-col gap-4 pb-6">
            <div className="flex flex-col gap-2">
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Tipo de Movimiento
              </label>
              <Select
                options={movementTypes}
                value={movementTypes.find((m) => m.value === movementType)}
                onChange={(option) =>
                  option && setMovementType(option.value as MovementType)
                }
                className="w-full text-black"
              />
            </div>
            {movementType === "EGRESO" && (
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Proveedor (opcional)
                </label>
                <Select
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.companyName,
                  }))}
                  value={selectedSupplier}
                  onChange={(option) => setSelectedSupplier(option)}
                  isClearable
                  placeholder="Seleccionar proveedor..."
                  className="w-full text-black"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Método de Pago
              </label>
              <Select
                options={paymentMethods}
                value={paymentMethods.find((m) => m.value === paymentMethod)}
                onChange={(option) => {
                  if (
                    option &&
                    ["EFECTIVO", "TRANSFERENCIA", "TARJETA"].includes(
                      option.value
                    )
                  ) {
                    setPaymentMethod(option.value as PaymentMethod);
                  }
                }}
                className="w-full text-black"
              />
            </div>

            <Input
              label="Monto"
              type="number"
              name="amount"
              placeholder="Ingrese el monto..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              label="Descripción"
              type="text"
              name="description"
              placeholder="Ingrese una descripción..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              text="Guardar"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={addMovement}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsOpenModal(false)}
            />
          </div>
        </Modal>
        <Modal
          isOpen={isOpenCashModal}
          onClose={() => setIsOpenCashModal(false)}
          title="Apertura de Caja"
        >
          <div className="flex flex-col gap-4 pb-6">
            <p className="text-gray_m dark:text-white">
              Para comenzar, ingrese el monto inicial en caja.
            </p>
            <Input
              label="Monto Inicial"
              type="number"
              name="initialAmount"
              placeholder="Ingrese el monto inicial..."
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              text="Abrir Caja"
              icon={<Check />}
              colorText="text-white"
              colorTextHover="text-white"
              onClick={openCash}
            />
          </div>
        </Modal>
        <DetailModal />
        <Modal
          isOpen={isCloseCashModal}
          onClose={() => setIsCloseCashModal(false)}
          title="Cierre de Caja"
        >
          <div className="flex flex-col gap-4 pb-6">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold">Resumen de Efectivo</h4>
              <p>
                Ingresos en efectivo:{" "}
                {formatCurrency(
                  currentDailyCash?.movements
                    .filter(
                      (m) =>
                        m.type === "INGRESO" && m.paymentMethod === "EFECTIVO"
                    )
                    .reduce((sum, m) => sum + m.amount, 0) || 0
                )}
              </p>
              <p>
                Egresos:{" "}
                {formatCurrency(
                  currentDailyCash?.movements
                    .filter((m) => m.type === "EGRESO")
                    .reduce((sum, m) => sum + m.amount, 0) || 0
                )}
              </p>
              <p className="font-semibold">
                Monto esperado:{" "}
                {formatCurrency(
                  (currentDailyCash?.initialAmount || 0) +
                    (currentDailyCash?.movements
                      .filter(
                        (m) =>
                          m.type === "INGRESO" && m.paymentMethod === "EFECTIVO"
                      )
                      .reduce((sum, m) => sum + m.amount, 0) || 0) -
                    (currentDailyCash?.movements
                      .filter((m) => m.type === "EGRESO")
                      .reduce((sum, m) => sum + m.amount, 0) || 0)
                )}
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold">Otros Ingresos</h4>
              <p>
                Transferencias:{" "}
                {formatCurrency(
                  currentDailyCash?.movements
                    .filter(
                      (m) =>
                        m.type === "INGRESO" &&
                        m.paymentMethod === "TRANSFERENCIA"
                    )
                    .reduce((sum, m) => sum + m.amount, 0) || 0
                )}
              </p>
              <p>
                Tarjetas:{" "}
                {formatCurrency(
                  currentDailyCash?.movements
                    .filter(
                      (m) =>
                        m.type === "INGRESO" && m.paymentMethod === "TARJETA"
                    )
                    .reduce((sum, m) => sum + m.amount, 0) || 0
                )}
              </p>
            </div>

            <Input
              label="Monto Contado en Efectivo"
              type="number"
              name="actualCashCount"
              placeholder="Ingrese el monto contado..."
              value={actualCashCount}
              onChange={(e) => setActualCashCount(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              text="Cerrar Caja"
              icon={<X />}
              colorText="text-white"
              colorTextHover="text-white"
              colorBg="bg-red-500"
              colorBgHover="hover:bg-red-700"
              onClick={closeCash}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsCloseCashModal(false)}
            />
          </div>
        </Modal>
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Movimiento"
        >
          <p className="text-gray_m dark:text-white">
            ¿Está seguro de que desea eliminar este movimiento?
          </p>
          {movementToDelete && (
            <div className="mt-2 p-3 bg-gray-100 rounded">
              <p>
                <strong>Tipo:</strong> {movementToDelete.type}
              </p>
              <p>
                <strong>Monto:</strong>{" "}
                {formatCurrency(movementToDelete.amount)}
              </p>
              <p>
                <strong>Descripción:</strong>{" "}
                {movementToDelete.description || "-"}
              </p>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              text="Eliminar"
              colorText="text-white"
              colorTextHover="text-white"
              colorBg="bg-red-500"
              colorBgHover="hover:bg-red-700"
              onClick={handleDeleteMovement}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsConfirmModalOpen(false)}
            />
          </div>
        </Modal>
        <Modal
          isOpen={isDeleteCashModalOpen}
          onClose={() => setIsDeleteCashModalOpen(false)}
          title="Eliminar Caja"
        >
          <p className="text-gray_m dark:text-white">
            ¿Está seguro de que desea eliminar esta caja? Esta acción no se
            puede deshacer.
          </p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              text="Eliminar"
              colorText="text-white"
              colorTextHover="text-white"
              colorBg="bg-red-500"
              colorBgHover="hover:bg-red-700"
              onClick={deleteDailyCash}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsDeleteCashModalOpen(false)}
            />
          </div>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </div>
    </ProtectedRoute>
  );
};

export default CajaDiariaPage;

"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import {
  CreditSale,
  Customer,
  DailyCash,
  DailyCashMovement,
  Payment,
} from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { Info, Wallet } from "lucide-react";
import Pagination from "@/app/components/Pagination";

const FiadosPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [creditsPerPage, setCreditsPerPage] = useState(5);
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentCreditSale, setCurrentCreditSale] = useState<CreditSale | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState(0);
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

  const filteredSales = creditSales.filter((sale) =>
    sale.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const salesByCustomer = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.customerName]) {
      acc[sale.customerName] = [];
    }
    acc[sale.customerName].push(sale);
    return acc;
  }, {} as Record<string, CreditSale[]>);

  const uniqueCustomers = Object.keys(salesByCustomer);
  const totalCustomers = uniqueCustomers.length;
  const indexOfLastCredit = currentPage * creditsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - creditsPerPage;
  const currentCustomers = uniqueCustomers.slice(
    indexOfFirstCredit,
    indexOfLastCredit
  );

  useEffect(() => {
    const fetchData = async () => {
      const [sales, payments, customers] = await Promise.all([
        db.sales.filter((sale) => sale.credit === true).toArray(),
        db.payments.toArray(),
        db.customers.toArray(),
      ]);

      setCreditSales(sales as CreditSale[]);
      setPayments(payments);
      setCustomers(customers);
    };

    fetchData();
  }, []);
  useEffect(() => {
    const fetchCreditSales = async () => {
      const sales = await db.sales
        .filter((sale) => sale.credit === true)
        .toArray();
      setCreditSales(sales as CreditSale[]);
    };

    const fetchPayments = async () => {
      const payments = await db.payments.toArray();
      setPayments(payments);
    };

    fetchCreditSales();
    fetchPayments();
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 3000);
  };

  const calculateCustomerBalance = (customerName: string) => {
    const customerSales = creditSales.filter(
      (sale) => sale.customerName === customerName
    );
    return customerSales.reduce((total, sale) => {
      const paymentsForSale = payments
        .filter((p) => p.saleId === sale.id)
        .reduce((sum, p) => sum + p.amount, 0);
      return total + (sale.total - paymentsForSale);
    }, 0);
  };

  const calculateRemainingBalance = (sale: CreditSale) => {
    if (!sale) return 0;
    const totalPayments = payments
      .filter((p) => p.saleId === sale.id)
      .reduce((sum, p) => sum + p.amount, 0);

    return sale.total - totalPayments;
  };
  const addIncomeToDailyCash = async (
    sale: CreditSale & { manualAmount?: number }
  ) => {
    // Verificación de tipos mejorada
    if (sale.credit && !sale.paid) {
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];

      // Agregar movimientos de productos
      if (sale.products && sale.products.length > 0) {
        sale.products.forEach((product) => {
          const profit =
            (product.price - (product.costPrice || 0)) * product.quantity;
          movements.push({
            id: Date.now(),
            amount:
              product.price *
              (product.unit === "gr"
                ? product.quantity / 1000
                : product.quantity),
            description: `Venta de ${product.name} - ${product.quantity} ${product.unit}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod:
              sale.paymentMethod === "Efectivo"
                ? "EFECTIVO"
                : sale.paymentMethod === "Tarjeta"
                ? "TARJETA"
                : "TRANSFERENCIA",
            productId: product.id,
            productName: product.name,
            quantity: product.quantity,
            unit: product.unit,
            profit: profit,
            isCreditPayment: sale.credit,
            originalSaleId: sale.id,
          });
        });
      }

      if (sale.manualAmount && sale.manualAmount > 0) {
        movements.push({
          id: Date.now(),
          amount: sale.manualAmount,
          description: "Monto manual adicional",
          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod:
            sale.paymentMethod === "Efectivo"
              ? "EFECTIVO"
              : sale.paymentMethod === "Tarjeta"
              ? "TARJETA"
              : "TRANSFERENCIA",
          isCreditPayment: sale.credit,
          originalSaleId: sale.id,
        });
      }

      if (!dailyCash) {
        const newDailyCash: DailyCash = {
          id: Date.now(),
          date: today,
          initialAmount: 0,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(newDailyCash);
      } else {
        const updatedCash: DailyCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: dailyCash.totalExpense || 0,
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

  const handleDeleteCustomerCredits = async () => {
    if (!customerToDelete) return;

    try {
      // Encontrar el cliente por nombre
      const customer = customers.find((c) => c.name === customerToDelete);

      if (!customer) {
        showNotification("Cliente no encontrado", "error");
        return;
      }

      // Eliminar solo las ventas a crédito y pagos asociados
      const salesToDelete = creditSales
        .filter((sale) => sale.customerName === customerToDelete)
        .map((sale) => sale.id);

      await db.sales.bulkDelete(salesToDelete);
      await db.payments.where("saleId").anyOf(salesToDelete).delete();

      // Actualizar estados
      setCreditSales(
        creditSales.filter((sale) => sale.customerName !== customerToDelete)
      );
      setPayments(payments.filter((p) => !salesToDelete.includes(p.saleId)));

      showNotification(
        `Todos los fiados de ${customerToDelete} eliminados`,
        "success"
      );
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setIsInfoModalOpen(false);

      // Nota: El cliente permanece en la base de datos
    } catch (error) {
      console.error("Error al eliminar fiados:", error);
      showNotification("Error al eliminar fiados", "error");
    }
  };
  const handleDeleteSingleCredit = async (saleId: number) => {
    try {
      await db.sales.delete(saleId);
      await db.payments.where("saleId").equals(saleId).delete();

      setCreditSales(creditSales.filter((sale) => sale.id !== saleId));
      setPayments(payments.filter((p) => p.saleId !== saleId));

      showNotification("Fiado eliminado correctamente", "success");

      // Actualizar la información del modal si está abierto
      if (currentCustomerInfo) {
        const updatedSales = currentCustomerInfo.sales.filter(
          (s) => s.id !== saleId
        );

        // Verificar si quedan fiados después de la eliminación
        if (updatedSales.length === 0) {
          setIsInfoModalOpen(false); // Cerrar el modal si no hay más fiados
          return;
        }

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          sales: updatedSales,
          balance: updatedSales.reduce((total, sale) => {
            const paymentsForSale = payments
              .filter((p) => p.saleId === sale.id)
              .reduce((sum, p) => sum + p.amount, 0);
            return total + (sale.total - paymentsForSale);
          }, 0),
        });
      }
    } catch (error) {
      console.error("Error al eliminar fiado:", error);
      showNotification("Error al eliminar fiado", "error");
    }
  };

  const handlePayment = async () => {
    if (!currentCreditSale || paymentAmount <= 0) return;

    try {
      const remainingBalance = calculateRemainingBalance(currentCreditSale);

      if (paymentAmount > remainingBalance) {
        showNotification("El monto excede el saldo pendiente", "error");
        return;
      }

      const newPayment: Payment = {
        id: Date.now(),
        saleId: currentCreditSale.id,
        amount: paymentAmount,
        date: new Date().toISOString(),
      };

      await db.payments.add(newPayment);
      setPayments([...payments, newPayment]);

      const newRemainingBalance = remainingBalance - paymentAmount;

      // Si se completó el pago, marcar como pagado y registrar en caja diaria
      if (newRemainingBalance <= 0) {
        await db.sales.update(currentCreditSale.id, { paid: true });

        // Crear objeto con todos los campos necesarios
        const saleToRegister: CreditSale = {
          ...currentCreditSale,
          total: paymentAmount,
          paid: true,
          products: currentCreditSale.products || [], // Asegurar que products existe
          paymentMethod: currentCreditSale.paymentMethod || "Efectivo", // Valor por defecto
        };

        await addIncomeToDailyCash(saleToRegister);
      }

      showNotification("Pago registrado correctamente", "success");
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);

      // Actualizar la lista de ventas
      const updatedSales = await db.sales.toArray();
      setCreditSales(
        updatedSales.filter((sale): sale is CreditSale => sale.credit === true)
      );

      // Actualizar la información del modal si está abierto
      if (currentCustomerInfo) {
        const updatedBalance = calculateCustomerBalance(
          currentCustomerInfo.name
        );
        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          balance: updatedBalance,
        });
      }
    } catch (error) {
      console.error("Error al registrar pago:", error);
      showNotification("Error al registrar pago", "error");
    }
  };

  const handleOpenInfoModal = (sale: CreditSale) => {
    const customerSales = creditSales.filter(
      (cs) => cs.customerName === sale.customerName
    );
    setCurrentCustomerInfo({
      name: sale.customerName,
      balance: calculateCustomerBalance(sale.customerName),
      sales: customerSales,
    });
    setIsInfoModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">
          Listado de fiados
        </h1>
        <div className="w-full mb-2">
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)] ">
          <table className="w-full text-center border-collapse">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Deuda</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white text-gray_b divide-y divide-gray_l">
              {totalCustomers > 0 ? (
                currentCustomers.map((customerName) => {
                  const sales = salesByCustomer[customerName];
                  const customerBalance =
                    calculateCustomerBalance(customerName);
                  const sortedSales = [...sales].sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  const oldestSale = sortedSales[0];

                  return (
                    <tr key={customerName}>
                      <td className="px-4 py-2">{customerName}</td>
                      <td className="px-4 py-2">
                        {format(new Date(oldestSale.date), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td
                        className={`px-4 py-2 ${
                          customerBalance <= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {customerBalance.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        })}
                      </td>
                      <td className="px-4 py-2 space-x-2">
                        <div className="flex justify-center items-center">
                          <Button
                            icon={<Info size={20} />}
                            iconPosition="left"
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            px="px-2"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleOpenInfoModal(oldestSale)}
                            text="Detalles"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td colSpan={4} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <Wallet size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">No hay fiados registrados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalCustomers > 0 && (
            <Pagination
              text="Fiados por página"
              text2="Total de fiados"
              currentPage={currentPage}
              totalItems={totalCustomers}
              itemsPerPage={creditsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setCreditsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          title={`Información de ${currentCustomerInfo?.name}`}
        >
          <div className="space-y-10">
            <p
              className={`text-lg font-semibold px-3 py-2 rounded-lg inline-block ${
                (currentCustomerInfo?.balance ?? 0) <= 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              Deuda total pendiente:{" "}
              {(currentCustomerInfo?.balance ?? 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </p>

            <div className="max-h-64 overflow-y-auto">
              <h3 className="font-semibold mb-2">Detalle de fiados:</h3>
              <table className="bg-white text-gray_b w-full text-center border-collapse">
                <thead className="bg-blue_b text-white">
                  <tr>
                    <th className="px-2 py-1">Fecha</th>
                    <th className="px-2 py-1">Total</th>
                    <th className="px-2 py-1">Pagado</th>
                    <th className="px-2 py-1">Debe</th>
                    <th className="px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200  ">
                  {currentCustomerInfo?.sales.map((sale) => {
                    const totalPayments = payments
                      .filter((p) => p.saleId === sale.id)
                      .reduce((sum, p) => sum + p.amount, 0);
                    const remainingBalance = sale.total - totalPayments;

                    return (
                      <tr key={sale.id}>
                        <td className="px-2 py-3">
                          {format(new Date(sale.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </td>
                        <td className="px-2 py-3">
                          {sale.total.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td className="px-2 py-3">
                          {totalPayments.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td
                          className={`px-2 py-3 ${
                            remainingBalance <= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {remainingBalance.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td className="flex justify-center items-center px-2 py-3 space-x-2">
                          <Button
                            text="Pagar"
                            colorText="text-white"
                            colorTextHover="text-white"
                            onClick={() => {
                              setCurrentCreditSale(sale);
                              setIsPaymentModalOpen(true);
                            }}
                            disabled={remainingBalance <= 0}
                          />
                          <Button
                            text="Eliminar"
                            colorText="text-white"
                            colorTextHover="text-white"
                            colorBg="bg-red-500"
                            colorBgHover="hover:bg-red-700"
                            onClick={() => handleDeleteSingleCredit(sale.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button
                text="Eliminar todos"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red-500"
                colorBgHover="hover:bg-red-700"
                onClick={() => {
                  setCustomerToDelete(currentCustomerInfo?.name || null);
                  setIsDeleteModalOpen(true);
                }}
                disabled={
                  !currentCustomerInfo || currentCustomerInfo.balance <= 0
                }
              />
              <div className="flex space-x-2">
                <Button
                  text="Cerrar"
                  colorText="text-gray_b dark:text-white"
                  colorTextHover="hover:text-white hover:dark:text-white"
                  colorBg="bg-gray_xl dark:bg-gray_m"
                  colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                  onClick={() => setIsInfoModalOpen(false)}
                />
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Registrar Pago"
        >
          <div className="space-y-4">
            <div>
              <p>Cliente: {currentCreditSale?.customerName || "Sin nombre"}</p>
              <p className="flex items-center gap-2">
                <span>Deuda pendiente:</span>
                <span
                  className={`px-2 py-1 rounded ${
                    calculateRemainingBalance(currentCreditSale!) <= 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  } font-semibold`}
                >
                  {calculateRemainingBalance(currentCreditSale!).toLocaleString(
                    "es-AR",
                    {
                      style: "currency",
                      currency: "ARS",
                    }
                  )}
                </span>
              </p>
            </div>

            <Input
              label="Monto del pago"
              type="number"
              value={paymentAmount.toString()}
              onChange={(e) =>
                setPaymentAmount(parseFloat(e.target.value) || 0)
              }
            />

            <div className="flex justify-end space-x-2">
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsPaymentModalOpen(false)}
              />
              <Button
                text="Registrar"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handlePayment}
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Fiados"
        >
          <div className="space-y-4">
            <p>
              ¿Está seguro que desea eliminar TODOS los fiados de{" "}
              {customerToDelete}?
            </p>
            <p className="font-semibold text-red-500">
              Deuda pendiente:{" "}
              {calculateCustomerBalance(customerToDelete || "").toLocaleString(
                "es-AR",
                {
                  style: "currency",
                  currency: "ARS",
                }
              )}
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsDeleteModalOpen(false)}
              />
              <Button
                text="Eliminar"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red-500"
                colorBgHover="hover:bg-red-700"
                onClick={handleDeleteCustomerCredits}
              />
            </div>
          </div>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </div>
    </ProtectedRoute>
  );
};

export default FiadosPage;

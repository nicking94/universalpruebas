import { useState, useCallback } from "react";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  Payment,
  DailyCashMovement,
  Sale,
  CreditDetails,
} from "@/app/lib/types/types";
import { differenceInDays, isBefore } from "date-fns";
import { getLocalDateString } from "../lib/utils/getLocalDate";

export const useCreditInstallments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [overdueInstallments, setOverdueInstallments] = useState<Installment[]>(
    []
  );

  const calculateInstallments = (
    totalAmount: number,
    numberOfInstallments: number,
    interestRate: number,
    startDate: string
  ): Installment[] => {
    const installments: Installment[] = [];
    const monthlyInterest = interestRate / 100;
    const installmentAmount = totalAmount / numberOfInstallments;

    const currentDate = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = installmentAmount * monthlyInterest;

      const installment: Installment = {
        creditSaleId: 0,
        number: i,
        dueDate: dueDate.toISOString(),
        amount: installmentAmount + interestAmount,
        interestAmount,
        penaltyAmount: 0,
        status: "pendiente",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      installments.push(installment);
    }

    return installments;
  };

  // En tu hook useCreditInstallments
  const getCreditSalesInInstallments = useCallback(async () => {
    try {
      const allSales = await db.sales.toArray();

      // Filtrar ventas que son crédito en cuotas
      const creditSales = allSales.filter(
        (sale) =>
          sale.credit === true &&
          sale.creditType === "credito_cuotas" &&
          sale.customerName
      );

      console.log(
        "Ventas de crédito en cuotas encontradas:",
        creditSales.length
      );
      console.log(
        "Clientes con crédito:",
        creditSales.map((s) => s.customerName)
      );

      return creditSales as CreditSale[];
    } catch (error) {
      console.error("Error fetching credit sales in installments:", error);
      return [];
    }
  }, []);

  const checkOverdueInstallments = useCallback(async () => {
    try {
      const today = new Date();

      // Primero obtenemos solo las ventas que son créditos en cuotas
      const creditSales = await getCreditSalesInInstallments();
      const creditSaleIds = creditSales.map((sale) => sale.id);

      if (creditSaleIds.length === 0) {
        setOverdueInstallments([]);
        return [];
      }

      // Luego obtenemos las cuotas solo de esos créditos
      const pendingInstallments = await db.installments
        .where("status")
        .equals("pendiente")
        .and((installment) => creditSaleIds.includes(installment.creditSaleId))
        .toArray();

      const overdue = pendingInstallments.filter((installment) => {
        const dueDate = new Date(installment.dueDate);
        return isBefore(dueDate, today);
      });

      // Actualizar estado a vencido
      overdue.forEach(async (installment) => {
        const daysOverdue = differenceInDays(
          today,
          new Date(installment.dueDate)
        );
        const penaltyRate = 0.05; // 5% de penalización por día de atraso
        const penaltyAmount = installment.amount * penaltyRate * daysOverdue;

        await db.installments.update(installment.id!, {
          status: "vencida",
          penaltyAmount,
          daysOverdue,
          updatedAt: new Date().toISOString(),
        });
      });

      setOverdueInstallments(overdue);
      return overdue;
    } catch (error) {
      console.error("Error checking overdue installments:", error);
      return [];
    }
  }, [getCreditSalesInInstallments]);

  const fetchInstallments = useCallback(
    async (creditSaleId?: number) => {
      setLoading(true);
      try {
        let installmentsData: Installment[];

        if (creditSaleId) {
          // Si se especifica un ID, verificar que sea un crédito en cuotas
          const sale = await db.sales.get(creditSaleId);
          if (sale && sale.creditType === "credito_cuotas") {
            installmentsData = await db.installments
              .where("creditSaleId")
              .equals(creditSaleId)
              .toArray();
          } else {
            installmentsData = [];
          }
        } else {
          // Obtener solo cuotas de créditos en cuotas
          const creditSales = await getCreditSalesInInstallments();
          const creditSaleIds = creditSales.map((sale) => sale.id);

          if (creditSaleIds.length > 0) {
            installmentsData = await db.installments
              .where("creditSaleId")
              .anyOf(creditSaleIds)
              .toArray();
          } else {
            installmentsData = [];
          }
        }

        setInstallments(installmentsData);
        return installmentsData;
      } catch (error) {
        console.error("Error fetching installments:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getCreditSalesInInstallments]
  );

  const payInstallment = async (
    installmentId: number,
    paymentMethod: PaymentMethod
  ) => {
    try {
      const installment = await db.installments.get(installmentId);
      if (!installment) throw new Error("Cuota no encontrada");

      const creditSale = await db.sales.get(installment.creditSaleId);
      if (!creditSale) throw new Error("Venta a crédito no encontrada");

      // 1. Actualizar la cuota
      await db.installments.update(installmentId, {
        status: "pagada",
        paymentDate: new Date().toISOString(),
        paymentMethod,
      });

      // 2. Crear registro de pago
      const payment: Payment = {
        id: Date.now(),
        saleId: creditSale.id,
        saleDate: creditSale.date,
        amount: installment.amount,
        date: new Date().toISOString(),
        method: paymentMethod,
        customerId: creditSale.customerId,
        customerName: creditSale.customerName,
      };
      await db.payments.add(payment);

      // 3. Actualizar el saldo del cliente
      if (creditSale.customerId) {
        const customer = await db.customers.get(creditSale.customerId);
        if (customer) {
          const newPendingBalance = Math.max(
            0,
            (customer.pendingBalance || 0) - installment.amount
          );
          await db.customers.update(creditSale.customerId, {
            pendingBalance: newPendingBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Registrar en caja diaria
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: installment.amount,
        description: `Pago cuota #${installment.number} - ${creditSale.customerName}`,
        type: "INGRESO",
        date: new Date().toISOString(),
        paymentMethod,
        isCreditPayment: true,
        originalSaleId: creditSale.id,
        customerName: creditSale.customerName,
        customerId: creditSale.customerId,
        createdAt: new Date().toISOString(),
      };

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: installment.amount,
          totalExpense: 0,
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, movement],
          totalIncome: (dailyCash.totalIncome || 0) + installment.amount,
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }

      // 5. Actualizar el estado de la venta si todas las cuotas están pagadas
      const remainingInstallments = await db.installments
        .where("creditSaleId")
        .equals(creditSale.id)
        .filter((inst) => inst.status !== "pagada")
        .toArray();

      // Calcular el monto pagado
      const paidInstallments = await db.installments
        .where("creditSaleId")
        .equals(creditSale.id)
        .filter((inst) => inst.status === "pagada")
        .toArray();

      const paidAmount = paidInstallments.reduce(
        (sum, inst) => sum + inst.amount,
        0
      );
      const remainingAmount = creditSale.total - paidAmount;
      const allPaid = remainingInstallments.length === 0;

      // Preparar las actualizaciones para la venta
      const saleUpdates: Partial<Sale> = {};

      // Solo para créditos en cuotas, actualizar creditDetails
      if (
        creditSale.creditType === "credito_cuotas" &&
        creditSale.creditDetails
      ) {
        const updatedCreditDetails: CreditDetails = {
          ...creditSale.creditDetails,
          paidAmount,
          remainingAmount,
          lastPaymentDate: new Date().toISOString(),
          isOverdue: false,
          overdueDays: 0,
        };

        // Si es la última cuota, marcar como pagado
        if (allPaid) {
          updatedCreditDetails.endDate = new Date().toISOString();
          updatedCreditDetails.nextDueDate = undefined;
        }

        saleUpdates.creditDetails = updatedCreditDetails;
      } else if (
        creditSale.creditType === "cuenta_corriente" &&
        creditSale.creditDetails
      ) {
        // Para cuenta corriente, también actualizar creditDetails
        const updatedCreditDetails: CreditDetails = {
          ...creditSale.creditDetails,
          paidAmount,
          remainingAmount,
          lastPaymentDate: new Date().toISOString(),
          isOverdue: false,
          overdueDays: 0,
        };

        saleUpdates.creditDetails = updatedCreditDetails;
      }

      // Si todas las cuotas están pagadas, podemos agregar un campo para marcar como completado
      // Como 'paid' no existe en Sale, podemos usar un campo en creditDetails o agregar metadata
      if (allPaid) {
        // Opcional: agregar un campo metadata si necesitas más información
        // Por ahora, solo actualizamos creditDetails
      }

      // Aplicar las actualizaciones
      if (Object.keys(saleUpdates).length > 0) {
        await db.sales.update(creditSale.id, saleUpdates);
      }

      setInstallments((prev) =>
        prev.map((inst) =>
          inst.id === installmentId
            ? {
                ...inst,
                status: "pagada",
                paymentDate: new Date().toISOString(),
                paymentMethod,
              }
            : inst
        )
      );

      return true;
    } catch (error) {
      console.error("Error al pagar cuota:", error);
      throw error;
    }
  };

  const generateCreditReport = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        // Obtener solo créditos en cuotas
        const creditSalesData = (await db.sales
          .where("creditType")
          .equals("credito_cuotas")
          .toArray()) as CreditSale[];

        // Obtener cuotas dentro del período para estos créditos
        const creditSaleIds = creditSalesData.map((sale) => sale.id);
        let allInstallments: Installment[] = [];

        if (creditSaleIds.length > 0) {
          allInstallments = await db.installments
            .where("creditSaleId")
            .anyOf(creditSaleIds)
            .and((installment) => {
              const dueDate = new Date(installment.dueDate);
              return (
                dueDate >= new Date(startDate) && dueDate <= new Date(endDate)
              );
            })
            .toArray();
        }

        const report = {
          period: { startDate, endDate },
          totalCreditSales: creditSalesData.length,
          totalAmount: creditSalesData.reduce(
            (sum, sale) => sum + sale.total,
            0
          ),
          installmentsByStatus: {
            pendiente: allInstallments.filter((i) => i.status === "pendiente")
              .length,
            pagada: allInstallments.filter((i) => i.status === "pagada").length,
            vencida: allInstallments.filter((i) => i.status === "vencida")
              .length,
          },
          totalInterest: allInstallments.reduce(
            (sum, i) => sum + i.interestAmount,
            0
          ),
          totalPenalties: allInstallments.reduce(
            (sum, i) => sum + i.penaltyAmount,
            0
          ),
          overdueInstallments: allInstallments.filter(
            (i) => i.status === "vencida"
          ),
        };

        return report;
      } catch (error) {
        console.error("Error generating credit report:", error);
        throw error;
      }
    },
    []
  );

  return {
    installments,
    loading,
    overdueInstallments,
    calculateInstallments,
    checkOverdueInstallments,
    fetchInstallments,
    payInstallment,
    generateCreditReport,
    setInstallments,
    getCreditSalesInInstallments,
  };
};

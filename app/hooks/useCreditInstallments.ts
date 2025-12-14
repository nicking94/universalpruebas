import { useState, useCallback } from "react";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  Sale,
} from "@/app/lib/types/types";
import { differenceInDays, isBefore } from "date-fns";

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

  const checkOverdueInstallments = useCallback(async () => {
    try {
      const today = new Date();
      const allInstallments = await db.installments
        .where("status")
        .equals("pendiente")
        .toArray();

      const overdue = allInstallments.filter((installment) => {
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
  }, []);

  const fetchInstallments = useCallback(async (creditSaleId?: number) => {
    setLoading(true);
    try {
      let installmentsData: Installment[];
      if (creditSaleId) {
        installmentsData = await db.installments
          .where("creditSaleId")
          .equals(creditSaleId)
          .toArray();
      } else {
        installmentsData = await db.installments.toArray();
      }

      setInstallments(installmentsData);
      return installmentsData;
    } catch (error) {
      console.error("Error fetching installments:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const payInstallment = useCallback(
    async (
      installmentId: number, // Asegurar que sea number
      paymentMethod: PaymentMethod,
      paymentDate: string = new Date().toISOString()
    ) => {
      try {
        const installment = await db.installments.get(installmentId);
        if (!installment) throw new Error("Installment not found");

        // Asegurar que installmentId es un número
        const idToUpdate = Number(installmentId);
        if (isNaN(idToUpdate)) {
          throw new Error("Invalid installment ID");
        }

        await db.installments.update(idToUpdate, {
          status: "pagada",
          paymentDate,
          paymentMethod,
          updatedAt: new Date().toISOString(),
        });

        // Actualizar crédito asociado
        const creditSale = (await db.sales.get(
          installment.creditSaleId
        )) as CreditSale;
        if (creditSale && creditSale.creditDetails) {
          const newPaidAmount =
            (creditSale.creditDetails.paidAmount || 0) + installment.amount;
          const newRemainingAmount = creditSale.total - newPaidAmount;

          await db.sales.update(installment.creditSaleId, {
            creditDetails: {
              ...creditSale.creditDetails,
              paidAmount: newPaidAmount,
              remainingAmount: newRemainingAmount,
              lastPaymentDate: paymentDate,
              updatedAt: new Date().toISOString(),
            },
          } as Partial<Sale>);
        }

        // Registrar movimiento en caja diaria
        const movement = {
          id: Date.now(),
          amount: installment.amount,
          description: `Pago cuota ${installment.number} - ${
            creditSale?.customerName || ""
          }`,
          type: "INGRESO" as const,
          date: paymentDate,
          paymentMethod: paymentMethod,
          isCreditPayment: true,
          originalSaleId: installment.creditSaleId,
          createdAt: new Date().toISOString(),
        };

        await db.dailyCashMovements.add(movement);

        return true;
      } catch (error) {
        console.error("Error paying installment:", error);
        throw error;
      }
    },
    []
  );

  const generateCreditReport = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        const allInstallments = await db.installments
          .where("dueDate")
          .between(startDate, endDate)
          .toArray();

        const creditSalesData = (await db.sales
          .filter((s) => s.credit === true && s.creditType === "credito_cuotas")
          .toArray()) as CreditSale[];

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
  };
};

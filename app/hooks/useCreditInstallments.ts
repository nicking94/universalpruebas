import { useState, useCallback } from "react";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  DailyCashMovement,
  DailyCash,
} from "@/app/lib/types/types";
import { differenceInDays, isBefore } from "date-fns";
import { getLocalDateString } from "../lib/utils/getLocalDate";
import { calculatePrice } from "../lib/utils/calculations";

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

    const start = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      // Calcular interés solo si hay tasa de interés
      const interestAmount =
        interestRate > 0
          ? (totalAmount / numberOfInstallments) * monthlyInterest
          : 0;

      const installmentAmount =
        totalAmount / numberOfInstallments + interestAmount;

      const installment: Installment = {
        creditSaleId: 0,
        number: i,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: parseFloat(installmentAmount.toFixed(2)),
        interestAmount: parseFloat(interestAmount.toFixed(2)),
        penaltyAmount: 0,
        status: "pendiente",
        daysOverdue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      installments.push(installment);
    }

    return installments;
  };

  const getCreditSalesInInstallments = useCallback(async () => {
    try {
      const allSales = await db.sales.toArray();

      // Filtrar exclusivamente créditos en cuotas
      const creditSales = allSales.filter(
        (sale) =>
          sale.credit === true &&
          sale.creditType === "credito_cuotas" && // Solo este tipo
          sale.customerName
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
      const today = getLocalDateString();
      const installment = await db.installments.get(installmentId);
      if (!installment) throw new Error("Cuota no encontrada");

      const sale = await db.sales.get(installment.creditSaleId);
      if (!sale) throw new Error("Venta no encontrada");

      // OBTENER LA GANANCIA REAL DE LOS PRODUCTOS
      let totalProfitFromProducts = 0;
      if (sale.products && sale.products.length > 0) {
        // Calcular la ganancia proporcional de esta cuota
        const totalSaleAmount = sale.total;
        const installmentRatio = installment.amount / totalSaleAmount;

        // Calcular ganancia total de la venta
        const saleTotalProfit = sale.products.reduce((sum, product) => {
          const priceInfo = calculatePrice(
            product,
            product.quantity,
            product.unit
          );
          return sum + priceInfo.profit;
        }, 0);

        // Ganancia proporcional de esta cuota
        totalProfitFromProducts = saleTotalProfit * installmentRatio;
      }

      // VERIFICAR SI YA ESTÁ PAGADA
      if (installment.status === "pagada") {
        throw new Error("Esta cuota ya fue pagada");
      }

      // Actualizar la cuota
      const now = new Date().toISOString();
      await db.installments.update(installmentId, {
        status: "pagada",
        paymentDate: now,
        paymentMethod,
        updatedAt: now,
      });

      // REGISTRAR EN CAJA DIARIA CON GANANCIA COMPLETA
      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: installment.amount,
        description: `Pago cuota #${installment.number} - ${sale.customerName}`,
        type: "INGRESO",
        date: now,
        paymentMethod,
        isCreditPayment: true,
        originalSaleId: sale.id,
        customerName: sale.customerName,
        customerId: sale.customerId,
        // Registrar ganancia: ganancia del producto + interés
        profit: totalProfitFromProducts + (installment.interestAmount || 0),
        createdAt: now,
        items:
          sale.products?.map((product) => ({
            productId: product.id,
            productName: product.name,
            quantity: product.quantity,
            unit: product.unit,
            price: product.price,
            costPrice: product.costPrice,
            profit: calculatePrice(product, product.quantity, product.unit)
              .profit,
          })) || [],
      };

      // Resto del código permanece igual...
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        const newDailyCash: DailyCash = {
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: installment.amount,
          totalExpense: 0,
          totalProfit:
            totalProfitFromProducts + (installment.interestAmount || 0),
        };
        await db.dailyCashes.add(newDailyCash);
      } else {
        const updatedMovements = [...dailyCash.movements, movement];
        const totalIncome = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        const totalProfit = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + (m.profit || 0), 0);

        await db.dailyCashes.update(dailyCash.id, {
          movements: updatedMovements,
          totalIncome,
          totalProfit,
        });
      }
    } catch (error) {
      console.error("Error al pagar la cuota:", error);
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

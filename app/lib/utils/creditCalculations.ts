// app/lib/utils/creditCalculations.ts

import { Installment, Sale } from "../types/types";

export const calculateInstallmentTotal = (
  principal: number,
  interestRate: number,
  numberOfInstallments: number
): number => {
  const monthlyRate = interestRate / 100 / 12;
  if (monthlyRate === 0) {
    return principal / numberOfInstallments;
  }

  const installment =
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, numberOfInstallments)) /
    (Math.pow(1 + monthlyRate, numberOfInstallments) - 1);

  return parseFloat(installment.toFixed(2));
};

export const calculateTotalWithInterest = (
  principal: number,
  interestRate: number,
  numberOfInstallments: number
): number => {
  const monthlyPayment = calculateInstallmentTotal(
    principal,
    interestRate,
    numberOfInstallments
  );
  return parseFloat((monthlyPayment * numberOfInstallments).toFixed(2));
};

export const verifyInstallmentConsistency = (
  sale: Sale,
  installments: Installment[]
): boolean => {
  if (!sale.creditDetails) return false;

  const calculatedTotal = installments.reduce(
    (sum, installment) =>
      sum + installment.amount + (installment.interestAmount || 0),
    0
  );

  return Math.abs(calculatedTotal - sale.total) < 0.01;
};

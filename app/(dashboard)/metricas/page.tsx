"use client";

import ProtectedRoute from "@/app/components/ProtectedRoute";
import { db } from "@/app/database/db";
import { DailyCash } from "@/app/lib/types/types";
import { formatCurrency } from "@/app/lib/utils/utils";
import {
  parseISO,
  isSameMonth,
  isSameYear,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

// Registrar componentes de Chart.js
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Metrics = () => {
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Obtener años disponibles para filtrar
  useEffect(() => {
    const fetchData = async () => {
      const storedDailyCashes = await db.dailyCashes.toArray();
      setDailyCashes(storedDailyCashes);

      const today = new Date().toISOString().split("T")[0];
      const todayCash = storedDailyCashes.find((dc) => dc.date === today);
      setCurrentDailyCash(todayCash || null);

      // Extraer años únicos de los datos
      const years = new Set<number>();
      storedDailyCashes.forEach((cash) => {
        const date = parseISO(cash.date);
        years.add(getYear(date));
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    };

    fetchData();
  }, []);

  // Obtener movimientos de productos para el ranking
  const getProductMovements = (period: "day" | "month" | "year") => {
    let filteredCashes = dailyCashes;

    if (period === "month") {
      filteredCashes = dailyCashes.filter((cash) => {
        const date = parseISO(cash.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      });
    } else if (period === "year") {
      filteredCashes = dailyCashes.filter((cash) => {
        const date = parseISO(cash.date);
        return isSameYear(date, new Date(selectedYear, 0));
      });
    } else if (period === "day" && currentDailyCash) {
      filteredCashes = [currentDailyCash];
    }

    const productMap = new Map<
      string,
      { quantity: number; amount: number; profit: number }
    >();

    filteredCashes.forEach((cash) => {
      cash.movements.forEach((movement) => {
        if (movement.type === "INGRESO" && movement.productName) {
          const existing = productMap.get(movement.productName) || {
            quantity: 0,
            amount: 0,
            profit: 0,
          };

          // Asegúrate de que costPrice y sellPrice están definidos
          const costPrice = movement.costPrice || 0;
          const sellPrice = movement.sellPrice || 0;
          const quantity = movement.quantity || 0;

          productMap.set(movement.productName, {
            quantity: existing.quantity + quantity,
            amount: existing.amount + movement.amount,
            profit: existing.profit + (sellPrice - costPrice) * quantity,
          });
        }
      });
    });

    return Array.from(productMap.entries())
      .map(([name, { quantity, amount, profit }]) => ({
        name,
        quantity,
        amount,
        profit,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  };

  const getDailySummary = () => {
    if (!currentDailyCash || !currentDailyCash.movements) return 0;

    return currentDailyCash.movements
      .filter((m) => m.type === "INGRESO")
      .reduce((sum, m) => {
        if (m.sellPrice && m.costPrice && m.quantity) {
          return (
            sum +
            (Number(m.sellPrice) - Number(m.costPrice)) * Number(m.quantity)
          );
        }
        return sum;
      }, 0);
  };

  // Obtener resumen mensual
  // Obtener resumen mensual
  const getMonthlySummary = () => {
    return dailyCashes
      .filter((cash) => {
        const date = parseISO(cash.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .reduce(
        (acc, cash) => {
          const ingresos = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const egresos = cash.movements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);

          // Sumar utilidad real de cada movimiento de ingreso (usando profit si existe)
          const ganancia = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              // Priorizar el campo profit si existe
              if (m.profit !== undefined) {
                return sum + m.profit;
              }
              // Si no hay profit, calcularlo
              const costPrice = m.costPrice || 0;
              const sellPrice = m.sellPrice || 0;
              const quantity = m.quantity || 0;
              return sum + (sellPrice - costPrice) * quantity;
            }, 0);

          return {
            ingresos: acc.ingresos + ingresos,
            egresos: acc.egresos + egresos,
            ganancia: acc.ganancia + ganancia,
          };
        },
        { ingresos: 0, egresos: 0, ganancia: 0 }
      );
  };

  // Obtener resumen anual
  const getAnnualSummary = () => {
    return dailyCashes
      .filter((cash) => {
        const date = parseISO(cash.date);
        return isSameYear(date, new Date(selectedYear, 0));
      })
      .reduce(
        (acc, cash) => {
          const ingresos = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const egresos = cash.movements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);

          // Sumar utilidad real de cada movimiento de ingreso
          const ganancia = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              if (m.sellPrice && m.costPrice && m.quantity) {
                return sum + (m.sellPrice - m.costPrice) * m.quantity;
              }
              return sum;
            }, 0);

          return {
            ingresos: acc.ingresos + ingresos,
            egresos: acc.egresos + egresos,
            ganancia: acc.ganancia + ganancia,
          };
        },
        { ingresos: 0, egresos: 0, ganancia: 0 }
      );
  };

  // Obtener datos diarios para el gráfico mensual
  // Obtener datos diarios para el gráfico mensual
  const getDailyDataForMonth = () => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dailyCash = dailyCashes.find((dc) => dc.date === dateStr);

      if (dailyCash) {
        const ingresos = dailyCash.movements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0);
        const egresos = dailyCash.movements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0);
        const ganancia = dailyCash.movements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => {
            // Priorizar profit si existe
            if (m.profit !== undefined) return sum + m.profit;
            // Calcular si no existe
            const costPrice = m.costPrice || 0;
            const sellPrice = m.sellPrice || 0;
            const quantity = m.quantity || 0;
            return sum + (sellPrice - costPrice) * quantity;
          }, 0);

        return { date: format(day, "dd"), ingresos, egresos, ganancia };
      }

      return { date: format(day, "dd"), ingresos: 0, egresos: 0, ganancia: 0 };
    });
  };

  // Obtener datos mensuales para el gráfico anual
  const getMonthlyDataForYear = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthData = dailyCashes
        .filter((cash) => {
          const date = parseISO(cash.date);
          return isSameMonth(date, new Date(selectedYear, i));
        })
        .reduce(
          (acc, cash) => {
            const ingresos = cash.movements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const egresos = cash.movements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const ganancia = cash.movements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => {
                if (m.sellPrice && m.costPrice && m.quantity) {
                  return (
                    sum +
                    (Number(m.sellPrice) - Number(m.costPrice)) *
                      Number(m.quantity)
                  );
                }
                return sum;
              }, 0);

            return {
              ingresos: acc.ingresos + ingresos,
              egresos: acc.egresos + egresos,
              ganancia: acc.ganancia + ganancia,
            };
          },
          { ingresos: 0, egresos: 0, ganancia: 0 }
        );

      return {
        month: format(new Date(selectedYear, i, 1), "MMM", { locale: es }),
        ...monthData,
      };
    });
  };

  const dailySummary = getDailySummary();
  const monthlySummary = getMonthlySummary();
  const annualSummary = getAnnualSummary();
  const dailyMonthData = getDailyDataForMonth();
  const monthlyYearData = getMonthlyDataForYear();
  const topProductsDaily = getProductMovements("day").slice(0, 5);
  const topProductsMonthly = getProductMovements("month").slice(0, 5);
  const topProductsYearly = getProductMovements("year").slice(0, 5);

  // Configuración de gráficos
  const monthlyBarChartData = {
    labels: dailyMonthData.map((data) => data.date),
    datasets: [
      {
        label: "Ingresos",
        data: dailyMonthData.map((data) => data.ingresos),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: dailyMonthData.map((data) => data.egresos),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlyProfitLineChartData = {
    labels: dailyMonthData.map((data) => data.date),
    datasets: [
      {
        label: "Ganancia Diaria",
        data: dailyMonthData.map((data) => data.ganancia),
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const annualBarChartData = {
    labels: monthlyYearData.map((data) => data.month),
    datasets: [
      {
        label: "Ingresos",
        data: monthlyYearData.map((data) => data.ingresos),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: monthlyYearData.map((data) => data.egresos),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const summaryPieChartData = {
    labels: ["Ingresos", "Egresos", "Ganancia"],
    datasets: [
      {
        data: [
          monthlySummary.ingresos,
          monthlySummary.egresos,
          monthlySummary.ganancia,
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Métricas</h1>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label
                htmlFor="month"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Mes:
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(selectedYear, i, 1), "MMMM", {
                      locale: es,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="year"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Año:
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Resumen Diario */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-500 dark:text-blue-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Diario
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(
                    currentDailyCash?.movements
                      .filter((m) => m.type === "INGRESO")
                      .reduce((sum, m) => sum + m.amount, 0) || 0
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(
                    currentDailyCash?.movements
                      .filter((m) => m.type === "EGRESO")
                      .reduce((sum, m) => sum + m.amount, 0) || 0
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(dailySummary)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-sm mb-2">
                Productos más vendidos hoy
              </h3>
              {topProductsDaily.length > 0 ? (
                <div className="space-y-2">
                  {topProductsDaily.map((product, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="truncate">{product.name}</span>
                      <span className="font-medium">
                        {product.quantity} un.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay datos de ventas hoy
                </p>
              )}
            </div>
          </div>

          {/* Resumen Mensual */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-500 dark:text-purple-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Mensual
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ingresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.egresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ganancia)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-sm mb-2">
                Productos más vendidos este mes
              </h3>
              {topProductsMonthly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsMonthly.map((product, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="truncate">{product.name}</span>
                      <span className="font-medium">
                        {product.quantity} un.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay datos de ventas este mes
                </p>
              )}
            </div>
          </div>

          {/* Resumen Anual */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-500 dark:text-indigo-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Anual
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ingresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.egresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ganancia)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-sm mb-2">
                Productos más vendidos este año
              </h3>
              {topProductsYearly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsYearly.map((product, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="truncate">{product.name}</span>
                      <span className="font-medium">
                        {product.quantity} un.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay datos de ventas este año
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de ingresos/egresos mensuales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              Ingresos vs Egresos -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>
            <Bar
              data={monthlyBarChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
                          context.raw as number
                        )}`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function (value) {
                        return formatCurrency(value as number);
                      },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Gráfico de ganancia mensual */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              Ganancia Diaria -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>
            <Line
              data={monthlyProfitLineChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
                          context.raw as number
                        )}`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    ticks: {
                      callback: function (value) {
                        return formatCurrency(value as number);
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráficos anuales y distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de ingresos/egresos anuales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              Ingresos vs Egresos - {selectedYear}
            </h2>
            <Bar
              data={annualBarChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
                          context.raw as number
                        )}`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function (value) {
                        return formatCurrency(value as number);
                      },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Gráfico de distribución mensual */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              Distribución Mensual -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>
            <Pie
              data={summaryPieChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "right",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || "";
                        const value = context.raw as number;
                        const total = context.dataset.data.reduce(
                          (a: number, b: number) => a + b,
                          0
                        );
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${formatCurrency(
                          value
                        )} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Metrics;

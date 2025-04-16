"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  CreditSale,
  Customer,
  DailyCashMovement,
  Product,
  Sale,
  UnitOption,
} from "@/app/lib/types/types";
import { Info, ShoppingCart, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select, { SingleValue } from "react-select";
import BarcodeScanner from "@/app/components/BarcodeScanner";

const VentasPage = () => {
  const currentYear = new Date().getFullYear();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newSale, setNewSale] = useState<Omit<Sale, "id">>({
    products: [],
    paymentMethod: "Efectivo",
    total: 0,
    date: new Date().toISOString(),
    barcode: "",
    manualAmount: 0,
  });

  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(5);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString().padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isCredit, setIsCredit] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const unitOptions: UnitOption[] = [
    { value: "Unid.", label: "Unidad" },
    { value: "Kg", label: "Kg" },
    { value: "gr", label: "gr" },
    { value: "L", label: "L" },
    { value: "ml", label: "Ml" },
  ];
  const calculatePrice = (product: Product): number => {
    const pricePerKg = product.price;
    const quantity = product.quantity;
    const unit = product.unit;
    if (unit === "Unid.") {
      return pricePerKg * quantity;
    }
    let quantityInKg: number;

    switch (unit) {
      case "gr":
        quantityInKg = quantity / 1000;
        break;
      case "Kg":
        quantityInKg = quantity;
        break;
      case "L":
      case "ml":
        quantityInKg = unit === "L" ? quantity : quantity / 1000;
        break;
      default:
        return pricePerKg * quantity;
    }

    return parseFloat((pricePerKg * quantityInKg).toFixed(2));
  };
  const calculateCombinedTotal = (
    products: Product[],
    manualAmount: number
  ) => {
    const productsTotal = products.reduce(
      (sum, p) => sum + calculatePrice(p),
      0
    );
    return productsTotal + manualAmount;
  };
  const updateStockAfterSale = (
    productId: number,
    soldQuantity: number,
    unit: Product["unit"]
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    const stockInGrams = convertToGrams(product.stock, product.unit);
    const soldQuantityInGrams = convertToGrams(soldQuantity, unit);

    if (stockInGrams < soldQuantityInGrams) {
      throw new Error(`Stock insuficiente para el producto ${product.name}`);
    }

    const newStockInGrams = stockInGrams - soldQuantityInGrams;
    const updatedStock = convertStockToUnit(newStockInGrams, product.unit);

    return updatedStock;
  };

  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case "Kg":
        return quantity * 1000;
      case "L":
        return quantity * 1000;
      case "gr":
        return quantity;
      case "ml":
        return quantity;
      default:
        return quantity;
    }
  };
  const convertStockToUnit = (
    stock: number,
    unit: string
  ): { quantity: number; unit: string } => {
    switch (unit) {
      case "gr":
        return { quantity: stock, unit: "gr" };
      case "Kg":
        return { quantity: stock / 1000, unit: "Kg" };
      case "ml":
        return { quantity: stock, unit: "ml" };
      case "L":
        return { quantity: stock / 1000, unit: "L" };
      default:
        return { quantity: stock, unit: "Unid." };
    }
  };
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };
  const productOptions: {
    value: number;
    label: string;
    isDisabled?: boolean;
  }[] = products.map((product) => {
    const stock = Number(product.stock);
    const isValidStock = !isNaN(stock);

    return {
      value: product.id,
      label:
        isValidStock && stock > 0 ? product.name : `${product.name} (agotado)`,
      isDisabled: !isValidStock || stock <= 0,
    };
  });
  const monthOptions = [...Array(12)].map((_, i) => {
    const month = (i + 1).toString().padStart(2, "0");
    return {
      value: month,
      label: format(new Date(2022, i), "MMMM", { locale: es }),
    };
  });
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });
  const paymentOptions: {
    value: "Efectivo" | "Transferencia" | "Tarjeta";
    label: string;
  }[] = [
    { value: "Efectivo", label: "Efectivo" },
    { value: "Transferencia", label: "Transferencia" },
    { value: "Tarjeta", label: "Tarjeta" },
  ];

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      const saleMonth = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const saleYear = saleDate.getFullYear().toString();

      const matchesMonth = selectedMonth ? saleMonth === selectedMonth : true;
      const matchesYear = selectedYear
        ? saleYear === selectedYear.toString()
        : true;

      return matchesMonth && matchesYear;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  const addIncomeToDailyCash = async (
    sale: Sale & { manualAmount?: number; credit?: boolean; paid?: boolean }
  ) => {
    if (sale.credit && !sale.paid) {
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      if (sale.products.length > 0) {
        sale.products.forEach((product) => {
          const profit = (product.price - product.costPrice) * product.quantity;
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
        dailyCash = {
          id: Date.now(),
          date: today,
          initialAmount: 0,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
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

  const handleProductScan = (productId: number) => {
    setNewSale((prevState) => {
      const existingProductIndex = prevState.products.findIndex(
        (p) => p.id === productId
      );

      if (existingProductIndex >= 0) {
        const updatedProducts = [...prevState.products];
        const existingProduct = updatedProducts[existingProductIndex];

        updatedProducts[existingProductIndex] = {
          ...existingProduct,
          quantity: existingProduct.quantity + 1,
        };
        const newTotal = updatedProducts.reduce(
          (sum, p) => sum + calculatePrice(p),
          0
        );

        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      } else {
        const productToAdd = products.find((p) => p.id === productId);
        if (!productToAdd) return prevState;

        const newProduct = {
          ...productToAdd,
          quantity: 1,
          unit: productToAdd.unit,
        };

        const updatedProducts = [...prevState.products, newProduct];
        const newTotal = updatedProducts.reduce(
          (sum, p) => sum + calculatePrice(p),
          0
        );

        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      }
    });
  };
  const handleManualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setNewSale((prev) => ({
      ...prev,
      manualAmount: value,
      total: calculateCombinedTotal(prev.products, value),
    }));
  };
  const handleMonthChange = (
    selectedOption: { value: string; label: string } | null
  ) => {
    setSelectedMonth(selectedOption ? selectedOption.value : "");
  };
  const handleYearChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    setSelectedYear(selectedOption ? selectedOption.value : currentYear);
  };
  const handleYearInputChange = (inputValue: string) => {
    const parsedYear = parseInt(inputValue, 10);

    if (/^\d{4}$/.test(inputValue) && !isNaN(parsedYear)) {
      setSelectedYear(parsedYear);
    }
  };
  const handlePaymentChange = (
    selectedOption: SingleValue<{
      value: "Efectivo" | "Transferencia" | "Tarjeta";
      label: string;
    }>
  ) => {
    if (!selectedOption) return;
    setNewSale((prev) => ({ ...prev, paymentMethod: selectedOption.value }));
  };

  const handleAddSale = () => {
    setIsOpenModal(true);
  };

  const handleConfirmAddSale = async () => {
    if (newSale.products.length === 0) {
      showNotification("Debe agregar al menos un producto", "error");
      return;
    }

    if (isCredit) {
      const normalizedName = customerName.toUpperCase().trim();

      if (!normalizedName) {
        showNotification("Debe ingresar un nombre de cliente", "error");
        return;
      }

      const nameExists = customers.some(
        (customer) =>
          customer.name.toUpperCase() === normalizedName &&
          (!selectedCustomer || customer.id !== selectedCustomer.value)
      );

      if (nameExists) {
        showNotification(
          "Este cliente ya existe. Seleccionalo de la lista",
          "error"
        );
        return;
      }
    }
    try {
      for (const product of newSale.products) {
        const updatedStock = updateStockAfterSale(
          product.id,
          product.quantity,
          product.unit
        );
        await db.products.update(product.id, { stock: updatedStock.quantity });
      }

      let customerId = selectedCustomer?.value;
      const generateCustomerId = (name: string): string => {
        const cleanName = name
          .toUpperCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-]/g, "");
        const timestamp = Date.now().toString().slice(-5);
        return `${cleanName}-${timestamp}`;
      };

      if (isCredit && !customerId && customerName) {
        const newCustomer: Customer = {
          id: generateCustomerId(customerName),
          name: customerName.toUpperCase().trim(),
          phone: customerPhone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.customers.add(newCustomer);
        customerId = newCustomer.id;
        setCustomers([...customers, newCustomer]);
        setCustomerOptions([
          ...customerOptions,
          { value: newCustomer.id, label: newCustomer.name },
        ]);
      }

      const saleToSave: CreditSale = {
        id: Date.now(),
        products: newSale.products,
        paymentMethod: newSale.paymentMethod,
        total: newSale.total,
        date: new Date().toISOString(),
        barcode: newSale.barcode,
        manualAmount: newSale.manualAmount,
        credit: isCredit,
        customerName: isCredit
          ? customerName.toUpperCase().trim()
          : "CLIENTE OCASIONAL",
        customerPhone: isCredit ? customerPhone : undefined,
        customerId: isCredit ? customerId : undefined,
        paid: false,
      };

      await db.sales.add(saleToSave);
      setSales([...sales, saleToSave]);

      if (!isCredit) {
        await addIncomeToDailyCash(saleToSave);
      }
      setNewSale({
        products: [],
        paymentMethod: "Efectivo",
        total: 0,
        date: new Date().toISOString(),
        barcode: "",
        manualAmount: 0,
      });
      setIsCredit(false);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedCustomer(null);

      setIsOpenModal(false);
      showNotification("Venta agregada correctamente", "success");
    } catch (error) {
      console.error("Error al agregar venta:", error);
      showNotification("Error al agregar venta | stock", "error");
    }
  };

  const handleOpenInfoModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInfoModalOpen(true);
  };

  const handleCloseModal = () => {
    setNewSale({
      products: [],
      paymentMethod: "Efectivo",
      total: 0,
      date: new Date().toISOString(),
      barcode: "",
    });
    setIsOpenModal(false);
  };
  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedSale(null);
  };

  const handleDeleteSale = async () => {
    if (saleToDelete) {
      await db.sales.delete(saleToDelete.id);
      setSales(sales.filter((sale) => sale.id !== saleToDelete.id));
      showNotification("Venta eliminada correctamente", "success");
      setIsConfirmModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleOpenDeleteConfirmation = (sale: Sale) => {
    setSaleToDelete(sale);
    setIsConfirmModalOpen(true);
  };
  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);

      setCustomerOptions(
        allCustomers.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))
      );
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const storedProducts = await db.products.toArray();
      setProducts(storedProducts);
    };

    const fetchSales = async () => {
      const storedSales = await db.sales.toArray();
      setSales(
        storedSales.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    };

    fetchProducts();
    fetchSales();
  }, []);

  const handleProductSelect = (
    selectedOptions: readonly {
      value: number;
      label: string;
      isDisabled?: boolean | undefined;
    }[]
  ) => {
    setNewSale((prevState) => {
      const updatedProducts = selectedOptions
        .map((option) => {
          const product = products.find((p) => p.id === option.value);
          if (!product) return null;

          const existingProduct = prevState.products.find(
            (p) => p.id === product.id
          );

          return existingProduct
            ? existingProduct
            : {
                ...product,
                quantity: 1,
                unit: product.unit,
                stock: Number(product.stock),
                price: Number(product.price),
              };
        })
        .filter(Boolean) as Product[];

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };

  const handleQuantityChange = (
    productId: number,
    quantity: number,
    unit: Product["unit"]
  ) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          return { ...p, quantity, unit };
        }
        return p;
      });

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };
  const handleUnitChange = (
    productId: number,
    selectedOption: SingleValue<UnitOption>,
    currentQuantity: number
  ) => {
    if (!selectedOption) return;

    setNewSale((prevState) => {
      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          const newUnit = selectedOption.value as Product["unit"];
          let newQuantity = currentQuantity;
          if (!isNaN(currentQuantity)) {
            if (p.unit === "Kg" && newUnit === "gr") {
              newQuantity = currentQuantity * 1000;
            } else if (p.unit === "gr" && newUnit === "Kg") {
              newQuantity = currentQuantity / 1000;
            } else if (p.unit === "L" && newUnit === "ml") {
              newQuantity = currentQuantity * 1000;
            } else if (p.unit === "ml" && newUnit === "L") {
              newQuantity = currentQuantity / 1000;
            }
            newQuantity = parseFloat(newQuantity.toFixed(3));
          }

          return {
            ...p,
            unit: newUnit,
            quantity: newQuantity,
          };
        }
        return p;
      });

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };
  const handleRemoveProduct = (productId: number) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.filter(
        (p) => p.id !== productId
      );

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };
  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredSales.length / salesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Ventas</h1>

        <div className="flex justify-between mb-2">
          <div className="flex w-full max-w-[20rem] gap-4">
            <Select
              value={monthOptions.find(
                (option) => option.value === selectedMonth
              )}
              onChange={handleMonthChange}
              options={monthOptions}
              placeholder="Mes"
              className="w-full h-[2rem] 2xl:h-auto text-black"
              classNamePrefix="react-select"
            />
            <Select
              value={
                yearOptions.find((option) => option.value === selectedYear) || {
                  value: selectedYear,
                  label: String(selectedYear),
                }
              }
              onChange={handleYearChange}
              onInputChange={handleYearInputChange}
              options={yearOptions}
              isClearable
              className="w-full h-[2rem] 2xl:h-auto text-black"
              classNamePrefix="react-select"
            />
          </div>
          <div className="w-full  flex justify-end">
            <Button
              text="Nueva Venta [F1]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddSale}
              hotkey="F1"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="text-xs xl:text-lg px-4 py-2 text-start ">
                  Producto
                </th>

                <th className="text-xs xl:text-lg px-4 py-2 ">Total</th>
                <th className=" text-xs xl:text-lg px-4 py-2 ">Fecha</th>
                <th className="text-xs xl:text-lg px-4 py-2 ">Forma De Pago</th>
                <th className="text-xs xl:text-lg px-4 py-2 w-[12rem] ">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-gray_b divide-y divide-gray_l">
              {currentSales.length > 0 ? (
                currentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={` text-xs 2xl:text-[.9rem] bg-white text-gray_b border-b border-gray_l`}
                  >
                    <td
                      className="font-semibold px-2 text-start uppercase border border-gray_l truncate max-w-[200px]"
                      title={sale.products.map((p) => p.name).join(", ")}
                    >
                      {sale.products.map((p) => p.name).join(", ").length > 60
                        ? sale.products
                            .map((p) => p.name)
                            .join(", ")
                            .slice(0, 30) + "..."
                        : sale.products
                            .map((p) => p.name + " x " + p.quantity + p.unit)
                            .join(" | ")}
                    </td>
                    <td className="font-semibold px-4 py-2 border border-gray_l">
                      {sale.credit ? (
                        <span className="text-orange-500">
                          FIADO - $
                          {sale.total.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        `$${sale.total.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}`
                      )}
                    </td>

                    <td className="font-semibold px-4 py-2 border border-gray_l">
                      {format(parseISO(sale.date), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </td>
                    <td className="font-semibold px-4 py-2 border border-gray_l">
                      {sale.paymentMethod}
                    </td>
                    <td className="flex justify-center items-center gap-2 p-2">
                      <Button
                        icon={<Info size={20} />}
                        colorText="text-gray_b"
                        colorTextHover="hover:text-white"
                        colorBg="bg-transparent"
                        px="px-1"
                        py="py-1"
                        minwidth="min-w-0"
                        onClick={() => handleOpenInfoModal(sale)}
                      />
                      <Button
                        icon={<Trash size={20} />}
                        colorText="text-gray_b"
                        colorTextHover="hover:text-white"
                        colorBg="bg-transparent"
                        colorBgHover="hover:bg-red-500"
                        px="px-1"
                        py="py-1"
                        minwidth="min-w-0"
                        onClick={() => handleOpenDeleteConfirmation(sale)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <ShoppingCart size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">Todavía no hay ventas.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedSale && (
            <Modal
              isOpen={isInfoModalOpen}
              onClose={handleCloseInfoModal}
              title="Detalles de la venta"
              bgColor="bg-white dark:bg-gray_b text-gray_m dark:text-white "
            >
              <div className="space-y-2 p-2">
                <p className="flex text-lg justify-between">
                  <strong>Total:</strong>
                  {formatPrice(selectedSale.total)}
                </p>
                <p className="flex text-lg justify-between">
                  <strong>Fecha:</strong>{" "}
                  {format(
                    parseISO(selectedSale.date),
                    "dd 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}
                </p>
                <p className="flex text-lg justify-between">
                  <strong>Forma de Pago:</strong> {selectedSale.paymentMethod}
                </p>

                <p className="text-center border-t-2 pt-4">
                  <strong>Productos:</strong>
                </p>
                <div>
                  <ul className="list-disc pl-5">
                    {selectedSale.products.map((product, index) => (
                      <li
                        className="flex justify-between uppercase px-10 border-b-1 border-gray_xl text-sm xl:text-md"
                        key={index}
                      >
                        <span className=" font-semibold">{product.name}</span>
                        <span className="lowercase">
                          <span className="text-sm font-light mr-1">x</span>
                          {product.quantity} {product.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  text="Cerrar"
                  colorText="text-gray_b dark:text-white"
                  colorTextHover="hover:text-white hover:dark:text-white"
                  colorBg="bg-gray_xl dark:bg-gray_m"
                  colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                  onClick={() => handleCloseInfoModal()}
                />
              </div>
            </Modal>
          )}
          {currentSales.length > 0 && (
            <Pagination
              text="Ventas por página"
              text2="Total de ventas"
              currentPage={currentPage}
              totalItems={filteredSales.length}
              itemsPerPage={salesPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setSalesPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isOpenModal}
          onConfirm={handleConfirmAddSale}
          onClose={handleCloseModal}
          title="Nueva Venta"
        >
          <form
            onSubmit={handleConfirmAddSale}
            className="flex flex-col gap-4 pb-6"
          >
            <div className="w-full flex items-center space-x-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_b dark:text-white mb-1">
                  Escanear código de barras
                </label>
                <BarcodeScanner
                  value={newSale.barcode || ""}
                  onChange={(value) =>
                    setNewSale({ ...newSale, barcode: value })
                  }
                  onScanComplete={(code) => {
                    const productToAdd = products.find(
                      (p) => p.barcode === code
                    );
                    if (productToAdd) {
                      handleProductScan(productToAdd.id);
                    } else {
                      showNotification("Producto no encontrado", "error");
                    }
                  }}
                />
              </div>
              <div className="w-full flex flex-col gap-2">
                <label
                  htmlFor="productSelect"
                  className="block text-gray_m dark:text-white text-sm font-semibold"
                >
                  Productos
                </label>
                <Select<
                  { value: number; label: string; isDisabled?: boolean },
                  true
                >
                  id="productSelect"
                  isOptionDisabled={(option) => option.isDisabled ?? false}
                  options={productOptions}
                  isMulti
                  onChange={handleProductSelect}
                  value={newSale.products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Seleccione productos"
                  className="text-black"
                />
              </div>
            </div>
            {newSale.products.length > 0 && (
              <table className="table-auto w-full ">
                <thead className=" bg-blue_b text-white ">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Unidad</th>
                    <th className="px-4 py-2 text-center">Cantidad</th>
                    <th className="px-4 py-2 text-center">Total</th>
                    <th className="px-4 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {newSale.products.map((product) => {
                    return (
                      <tr className="border-b border-gray-xl" key={product.id}>
                        <td className=" px-4 py-2">
                          {product.name.toUpperCase()}
                        </td>
                        <td>
                          {" "}
                          <Select
                            placeholder="Unidad"
                            options={unitOptions}
                            value={unitOptions.find(
                              (option) => option.value === product.unit
                            )}
                            onChange={(selectedOption) => {
                              handleUnitChange(
                                product.id,
                                selectedOption,
                                product.quantity
                              );
                            }}
                            className="text-black"
                          />
                        </td>
                        <td className="w-20 px-4 py-2 text-center">
                          <Input
                            type="number"
                            value={product.quantity.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || !isNaN(Number(value))) {
                                handleQuantityChange(
                                  product.id,
                                  value === "" ? 0 : Number(value),
                                  product.unit
                                );
                              }
                            }}
                            step={
                              product.unit === "Kg" || product.unit === "L"
                                ? "0.001"
                                : "1"
                            }
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                              if (e.target.value === "") {
                                handleQuantityChange(
                                  product.id,
                                  0,
                                  product.unit
                                );
                              }
                            }}
                          />
                        </td>

                        <td className="px-4 py-2 text-center">
                          $
                          {(
                            product.price *
                            (product.unit === "gr"
                              ? product.quantity / 1000
                              : product.quantity)
                          ).toFixed(2)}
                        </td>
                        <td className=" px-4 py-2 text-center">
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="cursor-pointer text-gray_b bg-gray_xl  p-1 rounded-sm"
                          >
                            <Trash size={20} />
                          </button>
                        </td>
                        <div></div>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="flex items-center space-x-4">
              <div className="w-full flex flex-col ">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Monto manual (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ingrese monto manual..."
                  value={newSale.manualAmount ? `$${newSale.manualAmount}` : ""}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, "");
                    handleManualAmountChange({
                      target: {
                        value: numericValue,
                      },
                    } as React.ChangeEvent<HTMLInputElement>);
                  }}
                />
              </div>

              <div className="w-full flex flex-col gap-2">
                <label
                  htmlFor="paymentMethod"
                  className="block text-gray_m dark:text-white text-sm font-semibold"
                >
                  Método de Pago
                </label>
                <Select
                  id="paymentMethod"
                  value={
                    paymentOptions.find(
                      (option) => option.value === newSale.paymentMethod
                    ) || null
                  }
                  onChange={handlePaymentChange}
                  options={paymentOptions}
                  placeholder="Seleccionar método de pago"
                  className="w-full text-gray_b"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="creditCheckbox"
                checked={isCredit}
                onChange={(e) => setIsCredit(e.target.checked)}
              />
              <label htmlFor="creditCheckbox">Registrar Fiado</label>
            </div>

            {isCredit && (
              <div className="space-y-2">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Cliente existente
                </label>
                <Select
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={(selected) => {
                    setSelectedCustomer(selected);
                    if (selected) {
                      const customer = customers.find(
                        (c) => c.id === selected.value
                      );
                      setCustomerName(customer?.name || "");
                      setCustomerPhone(customer?.phone || "");
                    }
                  }}
                  placeholder="Buscar cliente..."
                  isClearable
                  className="text-black"
                />
                <div className="flex items-center space-x-4 mt-4">
                  <Input
                    label="Nuevo cliente"
                    placeholder="Nombre del cliente..."
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value.toUpperCase());
                      setSelectedCustomer(null);
                    }}
                    disabled={!!selectedCustomer}
                    onBlur={(e) => {
                      setCustomerName(e.target.value.trim());
                    }}
                  />

                  <Input
                    label="Teléfono del cliente"
                    placeholder="Teléfono del cliente..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Input
              label="Total"
              type="text"
              name="totalPrice"
              placeholder="Precio total..."
              value={`$ ${newSale.total.toFixed(2)}`}
              readOnly
            />
          </form>

          <div className="flex justify-end space-x-2 mt-4">
            <Button
              text={"Guardar"}
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleConfirmAddSale}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={handleCloseModal}
            />
          </div>
        </Modal>

        <Modal
          isOpen={isConfirmModalOpen}
          title="Eliminar Venta"
          onClose={() => setIsConfirmModalOpen(false)}
        >
          <p>¿Está seguro de que desea eliminar esta venta?</p>
          <div className="flex justify-end space-x-2">
            <Button
              text="Si"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleDeleteSale}
            />
            <Button
              text="No"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsConfirmModalOpen(false)}
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

export default VentasPage;

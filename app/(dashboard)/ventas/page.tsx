"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import { Product, Sale, UnitOption } from "@/app/lib/types/types";
import { Info, Plus, ShoppingCart, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select, { SingleValue } from "react-select";

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
  });

  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(5);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const unitOptions: UnitOption[] = [
    { value: "Unid.", label: "Unidad" },
    { value: "Kg", label: "Kg" },
    { value: "gr", label: "gr" },
    { value: "L", label: "L" },
    { value: "ml", label: "Ml" },
  ];
  const calculatePrice = (product: Product): number => {
    const pricePerKg = product.price; // Precio por Kg
    const quantity = product.quantity; // Cantidad que se está vendiendo
    const unit = product.unit; // Unidad en la que se vende

    // Convertir la cantidad a kilogramos
    let quantityInKg: number;
    switch (unit) {
      case "gr":
        quantityInKg = quantity / 1000;
        break;
      case "Kg":
        quantityInKg = quantity;
        break;
      case "L":
        quantityInKg = quantity;
        break;
      case "ml":
        quantityInKg = quantity / 1000;
        break;
      default:
        quantityInKg = quantity;
        break;
    }

    // Calcular el precio total
    const totalPrice = pricePerKg * quantityInKg;
    return totalPrice;
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
    value: "Efectivo" | "Transferencia";
    label: string;
  }[] = [
    { value: "Efectivo", label: "Efectivo" },
    { value: "Transferencia", label: "Transferencia" },
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
      value: "Efectivo" | "Transferencia";
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

    try {
      for (const product of newSale.products) {
        const updatedStock = updateStockAfterSale(
          product.id,
          product.quantity,
          product.unit
        );

        await db.products.update(product.id, { stock: updatedStock.quantity });
      }

      const saleToSave: Sale = {
        id: Date.now(),
        products: newSale.products,
        paymentMethod: newSale.paymentMethod,
        total: newSale.total,
        date: new Date().toISOString(),
      };

      await db.sales.add(saleToSave);
      setSales([...sales, saleToSave]);

      setNewSale({
        products: [],
        paymentMethod: "Efectivo",
        total: 0,
        date: new Date().toISOString(),
      });

      setIsOpenModal(false);
      showNotification("Venta agregada correctamente", "success");
    } catch (error) {
      console.error("Error al agregar venta:", error);
      showNotification("Error al agregar venta", "error");
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
      // Mantener los productos existentes en el estado
      const existingProducts = prevState.products;

      // Crear una lista actualizada con los nuevos productos seleccionados
      const updatedProducts = selectedOptions
        .map((option) => {
          const product = products.find((p) => p.id === option.value);
          if (!product) return null;

          // Verificar si el producto ya existe en el estado actual
          const existingProduct = existingProducts.find(
            (p) => p.id === product.id
          );

          return existingProduct
            ? existingProduct // Mantener cantidad existente si ya está seleccionado
            : {
                ...product,
                quantity: 1,
                unit: product.unit, // Establecer la unidad inicial del producto
                stock: Number(product.stock),
                price: Number(product.price),
              };
        })
        .filter(Boolean) as Product[];

      const newTotal = updatedProducts.reduce(
        (sum, p) => sum + Number(p.price) * p.quantity,
        0
      );

      return { ...prevState, products: updatedProducts, total: newTotal };
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
          const updatedProduct = { ...p, quantity: quantity, unit: unit };
          return updatedProduct;
        }
        return p;
      });

      // Calculate the new total using calculatePrice
      const newTotal = updatedProducts.reduce(
        (sum, p) => sum + calculatePrice(p),
        0
      );

      return { ...prevState, products: updatedProducts, total: newTotal };
    });
  };
  const handleUnitChange = (
    productId: number,
    quantity: number,
    unit: Product["unit"]
  ) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          return { ...p, unit: unit, quantity: quantity };
        }
        return p;
      });

      // Calculate the new total using calculatePrice
      const newTotal = updatedProducts.reduce(
        (sum, p) => sum + calculatePrice(p),
        0
      );

      return { ...prevState, products: updatedProducts, total: newTotal };
    });
  };
  const handleRemoveProduct = (productId: number) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.filter(
        (p) => p.id !== productId
      );

      // Calculate the new total using calculatePrice
      const newTotal = updatedProducts.reduce(
        (sum, p) => sum + calculatePrice(p),
        0
      );

      return { ...prevState, products: updatedProducts, total: newTotal };
    });
  };

  // Get current sales
  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredSales.length / salesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <ProtectedRoute>
      <div className=" px-10 2xl:px-10 text-gray_l dark:text-white h-[calc(100vh-80px)]">
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
              icon={<Plus />}
              text="Nueva Venta"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddSale}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-170px)] 2xl:h-[calc(100vh-220px)">
          <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="px-4 py-2 text-start ">Producto</th>

                <th className="px-4 py-2 ">Total</th>
                <th className="px-4 py-2 ">Fecha</th>
                <th className="px-4 py-2 ">Forma De Pago</th>
                <th className="px-4 py-2 w-[12rem] ">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray_l ">
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
                            .map((p) => p.name + " x" + p.quantity)
                            .join(" | ")}
                    </td>
                    <td className="font-semibold px-4 py-2 border border-gray_l">
                      $
                      {sale.total.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
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
                      <ShoppingCart size={64} className="mb-4" />
                      <p>Todavía no hay ventas.</p>
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
              bgColor="bg-blue_b text-white dark:bg-gray_b"
            >
              <div className=" space-y-2 p-2">
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
                        className="flex justify-between uppercase px-10 border-b-1 border-gray_xl text-md xl:text-lg"
                        key={index}
                      >
                        <span className="font-semibold">{product.name}</span>
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
        </div>

        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title="Nueva Venta"
        >
          <form
            onSubmit={handleConfirmAddSale}
            className="flex flex-col gap-4 pb-6"
          >
            <div className="flex flex-col gap-2">
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
            {newSale.products.length > 0 && (
              <table className="table-auto w-full ">
                <thead className="border border-gray_xl bg-blue_b text-white ">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Cantidad</th>
                    <th className="px-4 py-2 text-center">Unidad</th>
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
                        <td className="w-20 px-4 py-2 text-center">
                          <Input
                            type="number"
                            value={product.quantity.toString()}
                            onChange={(e) => {
                              const quantity = Number(e.target.value);
                              handleQuantityChange(
                                product.id,
                                quantity,
                                product.unit
                              );
                            }}
                          />
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
                              if (selectedOption) {
                                handleUnitChange(
                                  product.id,
                                  product.quantity,
                                  selectedOption.value as Product["unit"]
                                );
                              }
                            }}
                          />
                        </td>
                        <td className=" px-4 py-2 text-center">
                          ${calculatePrice(product).toFixed(2)}
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

            <div className="flex flex-col gap-2">
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

            <Input
              label="Total"
              type="text"
              name="totalPrice"
              placeholder="Precio total..."
              value={`$ ${newSale.total}`}
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

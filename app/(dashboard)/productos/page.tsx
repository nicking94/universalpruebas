"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import { Product } from "@/app/lib/types/types";
import {
  Edit,
  Plus,
  Trash,
  PackageX,
  AlertTriangle,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/app/database/db";
import SearchBar from "@/app/components/SearchBar";
import { parseISO, format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    id: Date.now(),
    name: "",
    stock: 0,
    costPrice: 0,
    price: 0,
    expiration: "",
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };
  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  };
  const sortedProducts = useMemo(() => {
    // First filter the products
    const filtered = products.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery)
    );

    // Then sort the filtered products
    return [...filtered].sort((a, b) => {
      const expirationA = parseISO(a.expiration).getTime();
      const expirationB = parseISO(b.expiration).getTime();
      const today = startOfDay(new Date()).getTime();

      // Determine expiration status
      const isExpiredA = expirationA < today;
      const isExpiredB = expirationB < today;
      const isExpiringSoonA =
        expirationA >= today && expirationA <= today + 7 * 24 * 60 * 60 * 1000;
      const isExpiringSoonB =
        expirationB >= today && expirationB <= today + 7 * 24 * 60 * 60 * 1000;

      // Prioritize expired or soon-to-expire products
      if (isExpiredA !== isExpiredB)
        return Number(isExpiredB) - Number(isExpiredA);
      if (isExpiringSoonA !== isExpiringSoonB)
        return Number(isExpiringSoonB) - Number(isExpiringSoonA);

      // Sort by stock based on sortOrder (ascending or descending)
      return sortOrder === "asc"
        ? Number(a.stock) - Number(b.stock)
        : Number(b.stock) - Number(a.stock);
    });
  }, [products, searchQuery, sortOrder]);

  const handleSearch = (query: string) => {
    setSearchQuery(query.toLowerCase());
  };
  const hasChanges = (originalProduct: Product, updatedProduct: Product) => {
    return (
      originalProduct.name !== updatedProduct.name ||
      originalProduct.stock !== updatedProduct.stock ||
      originalProduct.costPrice !== updatedProduct.costPrice ||
      originalProduct.price !== updatedProduct.price ||
      originalProduct.expiration !== updatedProduct.expiration
    );
  };
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
  const handleAddProduct = () => {
    setIsOpenModal(true);
  };

  const handleConfirmAddProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.stock ||
      !newProduct.costPrice ||
      !newProduct.price ||
      !newProduct.expiration
    ) {
      showNotification("Por favor, complete todos los campos", "error");
      return;
    }

    try {
      if (editingProduct) {
        // Editar producto existente
        await db.products.update(editingProduct.id, newProduct);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? newProduct : p))
        );
        showNotification(`Producto ${newProduct.name} actualizado`, "success");
        setEditingProduct(null);
      } else {
        // Agregar nuevo producto
        const id = await db.products.add(newProduct);
        setProducts([...products, { ...newProduct, id }]);
        showNotification(`Producto ${newProduct.name} agregado`, "success");
      }
    } catch (error) {
      showNotification("Error al guardar el producto", "error");
      console.error(error);
    }

    // Resetear valores
    setNewProduct({
      id: Date.now(),
      name: "",
      stock: "",
      costPrice: 0,
      price: 0,
      expiration: "",
    });
    setIsOpenModal(false);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      await db.products.delete(productToDelete.id);
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      showNotification(`Producto ${productToDelete.name} eliminado`, "success");
      setProductToDelete(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setNewProduct({
      id: Date.now(),
      name: "",
      stock: "",
      costPrice: 0,
      price: 0,
      expiration: "",
    });
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setNewProduct({
      ...newProduct,
      [name]:
        name === "costPrice" || name === "price" || name === "stock"
          ? Number(value) || 0 // Asegurar que sea número o 0
          : value,
    });
  };
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct(product);
    setIsOpenModal(true);
  };
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  };
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(value);
    setNewProduct({
      ...newProduct,
      price: isNaN(numericValue) ? 0 : numericValue,
    });
  };

  useEffect(() => {
    if (editingProduct) {
      setIsSaveDisabled(!hasChanges(editingProduct, newProduct));
    } else {
      setIsSaveDisabled(
        !newProduct.name ||
          !newProduct.stock ||
          !newProduct.costPrice ||
          !newProduct.price ||
          !newProduct.expiration
      );
    }
  }, [newProduct, editingProduct]);
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const storedProducts = await db.products.toArray();
        if (isMounted) {
          setProducts(
            storedProducts
              .map((p) => ({ ...p, id: Number(p.id) }))
              .sort((a, b) => b.id - a.id)
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get current products
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const pageNumbers = [];
  for (
    let i = 1;
    i <= Math.ceil(sortedProducts.length / productsPerPage);
    i++
  ) {
    pageNumbers.push(i);
  }

  return (
    <ProtectedRoute>
      <div className="px-10 py-3 2xlp-10 text-gray_m dark:text-white h-[calc(100vh-80px)] min-h-[calc(100vh-80px)]">
        <h1 className="text-2xl font-semibold mb-2">Productos</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="w-full flex justify-end">
            <Button
              icon={<Plus />}
              text="Añadir Producto"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddProduct}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-220px)]">
          <table className=" table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="px-4 py-2 text-start ">Producto</th>
                <th
                  onClick={toggleSortOrder}
                  className="cursor-pointer flex justify-center items-center px-4 py-2"
                >
                  Stock
                  <button className="ml-2 cursor-pointer">
                    {sortOrder === "asc" ? <SortAsc /> : <SortDesc />}
                  </button>
                </th>
                <th className="px-4 py-2 ">Precio de costo</th>
                <th className="px-4 py-2 ">Precio de venta</th>
                <th className="px-4 py-2 ">Vencimiento</th>
                <th className="px-4 py-2 w-[12rem] ">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray_l">
              {sortedProducts.length > 0 ? (
                sortedProducts
                  .slice(indexOfFirstProduct, indexOfLastProduct)
                  .map((product, index) => {
                    const expirationDate = product.expiration
                      ? startOfDay(parseISO(product.expiration))
                      : null;
                    const today = startOfDay(new Date());

                    let daysUntilExpiration = null;
                    if (expirationDate) {
                      daysUntilExpiration = differenceInDays(
                        expirationDate,
                        today
                      );
                    }

                    const expiredToday = daysUntilExpiration === 0;
                    const isExpired =
                      daysUntilExpiration !== null && daysUntilExpiration < 0;
                    const isExpiringSoon =
                      daysUntilExpiration !== null &&
                      daysUntilExpiration > 0 &&
                      daysUntilExpiration <= 7;

                    return (
                      <tr
                        key={index}
                        className={`text-xs 2xl:text-[.9rem] border-b border-gray_l ${
                          isExpired
                            ? "border-l-2 border-l-red-500 text-gray_b bg-gray_xl"
                            : expiredToday
                            ? "border-l-2 border-l-red-500 text-white bg-red-500"
                            : isExpiringSoon
                            ? "border-l-2 border-l-red-500 text-gray_b bg-red-200 "
                            : "text-gray_b bg-white"
                        }`}
                      >
                        <td className="font-semibold px-4 py-2 text-start uppercase  flex items-center gap-2 ">
                          {expiredToday && (
                            <AlertTriangle
                              className="text-yellow-300 dark:text-yellow-500"
                              size={18}
                            />
                          )}
                          {isExpiringSoon && (
                            <AlertTriangle
                              className="text-yellow-800"
                              size={18}
                            />
                          )}
                          {isExpired && (
                            <AlertTriangle
                              className="text-red-400 dark:text-yellow-500"
                              size={18}
                            />
                          )}
                          {product.name}
                        </td>
                        <td
                          className={`${
                            !isNaN(Number(product.stock)) &&
                            Number(product.stock) > 0
                              ? ""
                              : "text-red-600"
                          } font-medium px-4 py-2 border border-gray_l`}
                        >
                          {!isNaN(Number(product.stock)) &&
                          Number(product.stock) > 0
                            ? `${product.stock} unid.`
                            : "Agotado"}
                        </td>
                        <td className="font-semibold px-4 py-2 border border-gray_l">
                          {formatPrice(product.costPrice)}
                        </td>
                        <td className="font-semibold px-4 py-2 border border-gray_l">
                          {formatPrice(product.price)}
                        </td>
                        <td className="font-semibold px-4 py-2 border border-gray_l">
                          {expirationDate
                            ? format(expirationDate, "dd/MM/yyyy", {
                                locale: es,
                              })
                            : "Sin fecha"}
                          {expiredToday && (
                            <span className="animate-pulse ml-2 text-white ">
                              (Vence Hoy)
                            </span>
                          )}
                          {isExpired && (
                            <span className="ml-2 text-red-500 ">
                              (Vencido)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 flex justify-center gap-4">
                          <Button
                            icon={<Edit />}
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleEditProduct(product)}
                          />
                          <Button
                            icon={<Trash />}
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            colorBgHover="hover:bg-red-500"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleDeleteProduct(product)}
                          />
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr className="h-[calc(63vh-2px)]">
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <PackageX size={64} className="mb-4" />
                      <p>Todavía no hay productos.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalItems={sortedProducts.length}
            itemsPerPage={productsPerPage}
            onPageChange={paginate}
            onItemsPerPageChange={(newItemsPerPage) => {
              setProductsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        </div>

        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          onConfirm={handleConfirmAddProduct}
          title={editingProduct ? "Editar Producto" : "Añadir Producto"}
          disabled={editingProduct ? isSaveDisabled : false}
        >
          <form className="flex flex-col gap-4">
            <Input
              label="Nombre del producto"
              type="text"
              name="name"
              placeholder="Nombre del producto..."
              value={newProduct.name}
              onChange={handleInputChange}
            />
            <Input
              label="Stock"
              type="number"
              name="stock"
              placeholder="Stock..."
              value={newProduct.stock.toString()}
              onChange={handleInputChange}
            />
            <Input
              label="Precio de costo"
              type="text"
              name="costPrice"
              placeholder="Precio de costo..."
              value={newProduct.costPrice.toString()}
              onChange={handleInputChange}
            />

            <Input
              label="Precio de venta"
              type="text"
              name="price"
              placeholder="Precio de venta..."
              value={newProduct.price.toString()}
              onChange={handlePriceChange}
            />

            <CustomDatePicker
              value={newProduct.expiration}
              onChange={(newDate) => {
                setNewProduct({ ...newProduct, expiration: newDate });
              }}
            />
          </form>
        </Modal>
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Producto"
          btnlText="Si"
          btnrText="No"
        >
          <p>¿Desea eliminar el producto {productToDelete?.name}?</p>
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

export default ProductsPage;

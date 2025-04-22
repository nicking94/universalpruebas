"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import { Supplier, SupplierContact } from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { Plus, Trash, Edit, Truck } from "lucide-react";
import Pagination from "@/app/components/Pagination";
import CustomDatePicker from "@/app/components/CustomDatePicker";

const ProveedoresPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [companyName, setCompanyName] = useState("");
  const [contacts, setContacts] = useState<SupplierContact[]>([
    { name: "", phone: "" },
  ]);
  const [lastVisit, setLastVisit] = useState<string | undefined>(undefined);
  const [nextVisit, setNextVisit] = useState<string | undefined>(undefined);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const allSuppliers = await db.suppliers.toArray();
      setSuppliers(allSuppliers);
      setFilteredSuppliers(allSuppliers);
    };

    fetchSuppliers();
  }, []);

  useEffect(() => {
    const filtered = suppliers.filter(
      (supplier) =>
        supplier.companyName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        supplier.contacts.some((contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 3000);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const resetForm = () => {
    setCompanyName("");
    setContacts([{ name: "", phone: "" }]);
    setLastVisit(undefined);
    setNextVisit(undefined);
    setEditingSupplier(null);
  };

  const handleAddContact = () => {
    setContacts([...contacts, { name: "", phone: "" }]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    const newContacts = [...contacts];
    newContacts.splice(index, 1);
    setContacts(newContacts);
  };

  const handleContactChange = (
    index: number,
    field: keyof SupplierContact,
    value: string
  ) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      showNotification("El nombre de la empresa es requerido", "error");
      return;
    }

    if (contacts.some((contact) => !contact.name.trim())) {
      showNotification("Todos los proveedores deben tener un nombre", "error");
      return;
    }

    try {
      const supplierData: Omit<Supplier, "id"> = {
        companyName: companyName.trim(),
        contacts: contacts.map((contact) => ({
          name: contact.name.trim(),
          phone: contact.phone?.trim(),
        })),
        lastVisit: lastVisit || undefined,
        nextVisit: nextVisit || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingSupplier) {
        const updatedSupplier = { ...editingSupplier, ...supplierData };
        await db.suppliers.update(editingSupplier.id, updatedSupplier);
        setSuppliers(
          suppliers.map((s) =>
            s.id === editingSupplier.id ? updatedSupplier : s
          )
        );
        showNotification("Proveedor actualizado correctamente", "success");
      } else {
        const id = await db.suppliers.add({
          ...supplierData,
          id: Date.now(),
        });
        const newSupplier = { ...supplierData, id };
        setSuppliers([...suppliers, newSupplier]);
        showNotification("Proveedor agregado correctamente", "success");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar proveedor:", error);
      showNotification("Error al guardar proveedor", "error");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setCompanyName(supplier.companyName);
    setContacts(
      supplier.contacts.length > 0
        ? supplier.contacts
        : [{ name: "", phone: "" }]
    );
    setLastVisit(supplier.lastVisit || undefined);
    setNextVisit(supplier.nextVisit || undefined);
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      await db.suppliers.delete(supplierToDelete.id);
      setSuppliers(suppliers.filter((s) => s.id !== supplierToDelete.id));
      showNotification("Proveedor eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      showNotification("Error al eliminar proveedor", "error");
    }
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSuppliers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Proveedores</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full max-w-md">
            <SearchBar onSearch={handleSearch} />
          </div>
          <Button
            icon={<Plus size={20} />}
            text="Nuevo Proveedor"
            colorText="text-white"
            colorTextHover="text-white"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <table className="w-full text-center border-collapse">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="px-4 py-2 text-left">Empresa</th>
                <th className="px-4 py-2">Proveedores</th>
                <th className="px-4 py-2">Última Visita</th>
                <th className="px-4 py-2">Próxima Visita</th>
                <th className="w-40 max-w-[10rem] px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl`}>
              {currentItems.length > 0 ? (
                currentItems.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-4 py-2 text-left font-semibold border border-gray_xl">
                      {supplier.companyName}
                    </td>
                    <td className="px-4 py-2  border border-gray_xl">
                      <div className="flex justify-center items-center space-x-4  ">
                        {supplier.contacts.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium">
                              {supplier.contacts[0].name}
                            </p>
                          </div>
                        )}
                        {supplier.contacts.length > 1 && (
                          <div className="group relative inline-block">
                            <span className="text-xs text-gray_l cursor-pointer">
                              +{supplier.contacts.length - 1} más
                            </span>
                            <div className="absolute hidden group-hover:block z-10 w-64 p-2 bg-white border border-gray-200 rounded shadow-lg text-sm">
                              {supplier.contacts
                                .slice(1)
                                .map((contact, index) => (
                                  <div key={index} className="py-1">
                                    <p className="font-medium">
                                      {contact.name}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {supplier.lastVisit ? (
                        format(parseISO(supplier.lastVisit), "dd/MM/yyyy", {
                          locale: es,
                        })
                      ) : (
                        <span className="text-gray_m">No registrada</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {supplier.nextVisit ? (
                        <span className="font-semibold">
                          {format(parseISO(supplier.nextVisit), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </span>
                      ) : (
                        <span className="text-gray_m">No programada</span>
                      )}
                    </td>
                    <td className="px-4 py-2 space-x-2 border border-gray_xl">
                      <div className="flex justify-center gap-2">
                        <Button
                          icon={<Edit size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => handleEdit(supplier)}
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
                          onClick={() => openDeleteModal(supplier)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td colSpan={5} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <Truck size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">
                        {searchQuery
                          ? "No hay proveedores que coincidan con la búsqueda"
                          : "No hay proveedores registrados"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredSuppliers.length > 0 && (
            <Pagination
              text="Proveedores por página"
              text2="Total de proveedores"
              currentPage={currentPage}
              totalItems={filteredSuppliers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        >
          <div className="space-y-4">
            <Input
              label="Nombre de la Empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Distribuidora S.A."
            />

            <div className="space-y-2">
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="bg-blue_xl space-y-2 border border-blue_xl shadow-lg shadow-gray_l p-4 mb-8"
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-blue_m rounded-md px-2 py-1 text-white text-sm font-medium">
                      Proveedor #{index + 1}
                    </span>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        text="Eliminar"
                        px="px-3"
                        py="py-1"
                        minwidth="min-w-0"
                        colorBg="bg-red-500"
                        colorBgHover="hover:bg-red-600"
                        colorText="text-white"
                        colorTextHover="hover:text-white"
                        onClick={() => handleRemoveContact(index)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <Input
                      colorLabel="text-gray_m"
                      label="Nombre"
                      value={contact.name}
                      onChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                      placeholder="Nombre del proveedor"
                    />
                    <Input
                      colorLabel="text-gray_m"
                      label="Teléfono"
                      value={contact.phone}
                      onChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                      placeholder="Teléfono del proveedor"
                    />
                  </div>
                </div>
              ))}
              <Button
                icon={<Plus size={16} />}
                text="Agregar otro proveedor"
                colorText="text-blue_b dark:text-white"
                colorTextHover="hover:text-blue_b dark:hover:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl dark:hover:bg-gray_l"
                onClick={handleAddContact}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustomDatePicker
                  label="Última Visita"
                  placeholderText="Seleccione una fecha"
                  value={lastVisit}
                  onChange={setLastVisit}
                  isClearable
                  error={null}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="Próxima Visita"
                  placeholderText="Seleccione una fecha"
                  value={nextVisit}
                  onChange={setNextVisit}
                  isClearable
                  error={null}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              text={editingSupplier ? "Actualizar" : "Guardar"}
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleSubmit}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            />
          </div>
        </Modal>
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Proveedor"
        >
          <p className="text-gray_m dark:text-white">
            ¿Está seguro de que desea eliminar el proveedor{" "}
            <span className="font-semibold">
              {supplierToDelete?.companyName}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              text="Eliminar"
              colorText="text-white"
              colorTextHover="text-white"
              colorBg="bg-red-500"
              colorBgHover="hover:bg-red-700"
              onClick={handleDelete}
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => setIsDeleteModalOpen(false)}
            />
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

export default ProveedoresPage;

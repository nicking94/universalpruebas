"use client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Definición de las unidades disponibles
export const unitOptions = [
  { value: "Unid.", label: "Unidad" },
  { value: "Kg", label: "Kg" },
  { value: "gr", label: "gr" },
  { value: "L", label: "L" },
  { value: "ml", label: "Ml" },
] as const;

// Tipo para las opciones de unidad
export type UnitOption = (typeof unitOptions)[number];

// Esquema de validación para el producto
export const productSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  stock: z
    .number()
    .min(0, "El stock no puede ser negativo")
    .max(9999, "El stock no puede ser mayor a 9999"),
  costPrice: z
    .number()
    .min(0, "El precio de costo no puede ser negativo")
    .max(999999, "El precio no puede ser mayor a 999999"),
  price: z
    .number()
    .min(0, "El precio de venta no puede ser negativo")
    .max(999999, "El precio no puede ser mayor a 999999")
    .refine(
      (value) => value === 0 || value >= 1,
      "El precio de venta debe ser al menos 1 si no es 0"
    ),
  expiration: z
    .string()
    .min(1, "La fecha de vencimiento es requerida")
    .refine(
      (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      { message: "Fecha inválida" }
    ),
  unit: z.enum(["Unid.", "Kg", "gr", "L", "ml"], {
    errorMap: () => ({ message: "Selecciona una unidad válida" }),
  }),
  quantity: z.number().optional(),
});

// Tipo inferido del esquema
export type ProductFormValues = z.infer<typeof productSchema>;

// Resolver para react-hook-form
export const productFormResolver = zodResolver(productSchema);

// Valores iniciales del formulario
export const defaultProductValues: ProductFormValues = {
  name: "",
  stock: 0,
  costPrice: 0,
  price: 0,
  expiration: "",
  unit: "Unid.",
  quantity: 0,
};

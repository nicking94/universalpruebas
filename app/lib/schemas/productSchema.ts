// schemas/productSchema.ts
import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  stock: z
    .number({ invalid_type_error: "El stock debe ser un número" })
    .min(1, "El stock debe ser mayor a 0"),
  costPrice: z
    .number({ invalid_type_error: "El precio de costo debe ser un número" })
    .min(0, "El precio de costo no puede ser negativo"),
  price: z
    .number({ invalid_type_error: "El precio debe ser un número" })
    .min(1, "El precio debe ser mayor a 0"),
  expiration: z.date({
    invalid_type_error: "La fecha de vencimiento debe ser una fecha válida",
  }),
});

export type ProductFormValues = z.infer<typeof productSchema>;

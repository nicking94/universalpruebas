import Dexie, { Table } from "dexie";
import {
  Product,
  Sale,
  Theme,
  DailyCash,
  Customer,
  Supplier,
  Payment,
  User,
  SupplierProduct,
} from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  users!: Table<User, number>;
  auth!: Table<
    { id: number; isAuthenticated: boolean; userId?: number },
    number
  >;
  sales!: Table<Sale, number>;
  dailyCashes!: Table<DailyCash, number>;
  dailyCashMovements!: Table<{ id: number; dailyCashId: number }, number>;
  payments!: Table<Payment, number>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, number>;
  supplierProducts!: Table<SupplierProduct, [number, number]>;
  trialPeriods!: Table<
    { id: number; firstAccessDate: Date; userId: number },
    number
  >;
  appState!: Table<{ id: number; lastActiveDate: Date }, number>;

  constructor() {
    super("MyDatabase");
    this.version(5).stores({
      theme: "id",
      products: "++id, name, barcode, stock",
      users: "id, username",
      auth: "id",
      sales:
        "++id, date, *paymentMethod, customerName, customerId, paid, credit",
      dailyCashes: "++id, &date, closed",
      dailyCashMovements: "++id, dailyCashId, date, type",
      payments: "++id, saleId, date, method",
      customers: "&id, name",
      suppliers: "++id, companyName, lastVisit, nextVisit, createdAt",
      supplierProducts: "[supplierId+productId], supplierId, productId",
      appState: "id",
    });
  }
}

export const db = new MyDatabase();

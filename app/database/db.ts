import Dexie, { Table } from "dexie";
import {
  Product,
  Sale,
  Theme,
  DailyCash,
  Customer,
  Supplier,
  Payment,
} from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  auth!: Table<{ id: number; isAuthenticated: boolean }, number>;
  sales!: Table<Sale, number>;
  dailyCashes!: Table<DailyCash, number>;
  dailyCashMovements!: Table<{ id: number; dailyCashId: number }, number>;
  payments!: Table<Payment, number>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, number>;

  constructor() {
    super("MyDatabase");
    this.version(3).stores({
      theme: "id",
      products: "++id, name, barcode, stock",
      auth: "id",
      sales:
        "++id, date, *paymentMethod, customerName, customerId, paid, credit",
      dailyCashes: "++id, &date, closed",
      dailyCashMovements: "++id, dailyCashId, date, type",
      payments: "++id, saleId, date, method",
      customers: "&id, name",
      suppliers: "++id, companyName, lastVisit, nextVisit, createdAt",
    });
  }
}

export const db = new MyDatabase();

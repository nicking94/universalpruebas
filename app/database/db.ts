import Dexie, { Table } from "dexie";
import { Product, Sale, Theme, DailyCash } from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  auth!: Table<{ id: number; isAuthenticated: boolean }, number>;
  sales!: Table<Sale, number>;
  dailyCashes!: Table<DailyCash, number>;

  constructor() {
    super("MyDatabase");
    this.version(2).stores({
      theme: "id",
      products:
        "++id, name, stock, costPrice, price, expiration, quantity, unit, barcode",
      auth: "id,isAuthenticated",
      sales:
        "++id, product, quantity, paymentMethod, total, date, barcode, manualAmount",
      dailyCashes: "++id, &date, closed, [date+closed], initialAmount",
      dailyCashMovements: "++id, dailyCashId, amount, type, date, description",
    });
  }
}

export const db = new MyDatabase();

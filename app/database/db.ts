import Dexie, { Table } from "dexie";
import { Product, Sale, Theme } from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  auth!: Table<{ id: number; isAuthenticated: boolean }, number>;
  sales!: Table<Sale, number>;

  constructor() {
    super("MyDatabase");
    this.version(1).stores({
      theme: "id",
      products:
        "++id, name, stock, costPrice, price, expiration, quantity, unit, barcode",
      auth: "id,isAuthenticated",
      sales: "++id, product, quantity, paymentMethod, total, date, barcode",
    });
  }
}
export const db = new MyDatabase();

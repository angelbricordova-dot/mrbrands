import "server-only";
import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import type { Store } from "./types";

export { OutOfStockError } from "./types";

export function store(): Store {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL ? postgresStore : memoryStore;
}

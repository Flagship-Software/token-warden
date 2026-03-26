import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as sqlite from "./schema.sqlite";

export type WardenDb = BetterSQLite3Database<typeof sqlite>;
export type WardenSchema = typeof sqlite;

export type CostEvent = InferSelectModel<typeof sqlite.costEvents>;
export type NewCostEvent = InferInsertModel<typeof sqlite.costEvents>;
export type Budget = InferSelectModel<typeof sqlite.budgets>;
export type NewBudget = InferInsertModel<typeof sqlite.budgets>;
export type Alert = InferSelectModel<typeof sqlite.alerts>;
export type NewAlert = InferInsertModel<typeof sqlite.alerts>;
export type ModelPricing = InferSelectModel<typeof sqlite.modelPricing>;
export type NewModelPricing = InferInsertModel<typeof sqlite.modelPricing>;

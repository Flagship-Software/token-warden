import { sql, type SQL, type Column } from "drizzle-orm";

let dialect: "sqlite" | "pg" = "sqlite";

export function setDialect(d: "sqlite" | "pg") {
  dialect = d;
}

export function getDialect(): "sqlite" | "pg" {
  return dialect;
}

export function dateFromEpoch(column: Column): SQL<string> {
  if (dialect === "pg") {
    return sql<string>`to_char(to_timestamp(${column} / 1000.0), 'YYYY-MM-DD')`;
  }
  return sql<string>`DATE(${column} / 1000, 'unixepoch')`;
}

export const resolvedTrue = (): SQL => (dialect === "pg" ? sql`true` : sql`1`);
export const resolvedFalse = (): SQL =>
  dialect === "pg" ? sql`false` : sql`0`;

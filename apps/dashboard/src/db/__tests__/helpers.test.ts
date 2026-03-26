import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import {
  setDialect,
  getDialect,
  resolvedTrue,
  resolvedFalse,
} from "../helpers";

function toSqlString(expr: ReturnType<typeof sql>): string {
  return expr.queryChunks
    .filter((chunk): chunk is NonNullable<typeof chunk> => chunk != null)
    .flatMap((chunk) =>
      typeof chunk === "string"
        ? [chunk]
        : "value" in chunk
          ? (chunk as { value: unknown[] }).value
          : [String(chunk)],
    )
    .join("");
}

describe("dialect helpers", () => {
  describe("SQLite dialect", () => {
    beforeEach(() => setDialect("sqlite"));

    it("getDialect returns sqlite", () => {
      expect(getDialect()).toBe("sqlite");
    });

    it("resolvedTrue returns SQL expression '1'", () => {
      expect(toSqlString(resolvedTrue())).toBe("1");
    });

    it("resolvedFalse returns SQL expression '0'", () => {
      expect(toSqlString(resolvedFalse())).toBe("0");
    });
  });

  describe("Postgres dialect", () => {
    beforeEach(() => setDialect("pg"));

    it("getDialect returns pg", () => {
      expect(getDialect()).toBe("pg");
    });

    it("resolvedTrue returns SQL expression 'true'", () => {
      expect(toSqlString(resolvedTrue())).toBe("true");
    });

    it("resolvedFalse returns SQL expression 'false'", () => {
      expect(toSqlString(resolvedFalse())).toBe("false");
    });
  });
});

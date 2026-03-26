import { NextResponse } from "next/server";
import { db, modelPricing } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const apiKey = process.env.WARDEN_API_KEY ?? "tw_dev_key";
  const isPg = process.env.DATABASE_URL?.startsWith("postgres");

  let modelsLoaded = 0;
  try {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(modelPricing);
    modelsLoaded = result[0]?.count ?? 0;
  } catch {
    return NextResponse.json({ status: "error", using_default_key: apiKey === "tw_dev_key", database: isPg ? "postgres" : "sqlite", models_loaded: 0 }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", using_default_key: apiKey === "tw_dev_key", database: isPg ? "postgres" : "sqlite", models_loaded: modelsLoaded });
}

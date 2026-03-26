"use server";

import { db } from "@/db";
import { budgets, alerts } from "@/db";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { revalidatePath } from "next/cache";
import { resolvedTrue } from "@/db/helpers";

export async function createBudget(formData: FormData) {
  const feature = formData.get("feature") as string;
  const period = formData.get("period") as string;
  const limitUsd = parseFloat(formData.get("limitUsd") as string);
  const alertThreshold =
    parseFloat(formData.get("alertThreshold") as string) / 100;
  const webhookUrl = (formData.get("webhookUrl") as string) || null;
  const email = (formData.get("email") as string) || null;

  if (!feature || !period || isNaN(limitUsd)) {
    return { error: "Missing required fields" };
  }

  await db.insert(budgets).values({
    id: ulid(),
    feature,
    period,
    limitUsd,
    alertThreshold,
    webhookUrl,
    email,
    createdAt: Date.now(),
  });

  revalidatePath("/alerts");
}

export async function deleteBudget(budgetId: string) {
  await db.delete(budgets).where(eq(budgets.id, budgetId));
  revalidatePath("/alerts");
}

export async function resolveAlert(alertId: string) {
  await db
    .update(alerts)
    .set({ resolved: resolvedTrue() })
    .where(eq(alerts.id, alertId));
  revalidatePath("/alerts");
}

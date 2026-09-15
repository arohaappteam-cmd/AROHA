import type { Attribute } from "@/generated/prisma/enums";
import { ATTRIBUTES } from "@/modules/progression/attributes";

export type AttributeTotal = { attribute: Attribute; total: number };

/**
 * Fills in every attribute (zero when absent) and keeps display order,
 * so the UI never has to guess which attributes exist.
 */
export function normalizeAttributeTotals(
  rows: readonly AttributeTotal[],
): AttributeTotal[] {
  const byAttribute = new Map(rows.map((row) => [row.attribute, row.total]));
  return ATTRIBUTES.map(({ key }) => ({
    attribute: key,
    total: byAttribute.get(key) ?? 0,
  }));
}

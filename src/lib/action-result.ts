import { z } from "zod";

/** The failure half, assignable to every result type below. */
export type ActionFailure = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ActionResult = { ok: true; message?: string } | ActionFailure;

/** An ActionResult that carries a payload on success (e.g. XP awarded). */
export type ActionResultWith<T> = { ok: true; message?: string; data: T } | ActionFailure;

export function validationFailure(error: z.ZodError): ActionFailure {
  const flat = z.flattenError(error);
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[field] = messages as string[];
    }
  }
  return {
    ok: false,
    error:
      flat.formErrors[0] ??
      Object.values(fieldErrors)[0]?.[0] ??
      "Please check the highlighted fields",
    fieldErrors,
  };
}

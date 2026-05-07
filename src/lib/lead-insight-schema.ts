import { z } from "zod";

/**
 * Shape of JSON columns on `LeadInsight` — kept as string arrays for a stable API and simple UI.
 * The LLM must return this object; we validate before `prisma.leadInsight.create`.
 */
const jsonStringListSchema = z.array(z.string()).default([]);

export const leadInsightPayloadSchema = z
  .object({
    summary: z.string().min(1, "summary is required"),
    companyType: z.string().min(1, "companyType is required"),
    priorityScore: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("0–100 lead quality / follow-up priority"),
    talkingPoints: jsonStringListSchema,
    recommendedProducts: jsonStringListSchema,
    risks: jsonStringListSchema,
  })
  .strict();

export type LeadInsightPayload = z.infer<typeof leadInsightPayloadSchema>;

export function parseLeadInsightPayload(value: unknown) {
  return leadInsightPayloadSchema.safeParse(value);
}

/** Prisma `Json` values for create/update (arrays serialize to JSON arrays). */
export function payloadToInsightJsonColumns(payload: LeadInsightPayload): {
  talkingPoints: string[];
  recommendedProducts: string[];
  risks: string[];
} {
  return {
    talkingPoints: payload.talkingPoints,
    recommendedProducts: payload.recommendedProducts,
    risks: payload.risks,
  };
}

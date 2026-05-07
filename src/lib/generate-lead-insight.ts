import OpenAI from "openai";
import type { Contractor } from "@prisma/client";
import {
  type LeadInsightPayload,
  parseLeadInsightPayload,
} from "@/lib/lead-insight-schema";

/**
 * Project-wide default for insight generation: good JSON fidelity, low cost/latency.
 * Set `OPENAI_MODEL` to override (e.g. `gpt-4o` if you need stronger nuance on priority/risk).
 */
export const DEFAULT_INSIGHT_MODEL = "gpt-4o-mini" as const;

/** Fields we send to the model — grounded facts only. */
export type ContractorFacts = Pick<
  Contractor,
  | "name"
  | "phone"
  | "website"
  | "address"
  | "city"
  | "state"
  | "zipCode"
  | "certificationLevel"
>;

export type GenerateLeadInsightResult = {
  payload: LeadInsightPayload;
  modelVersion: string;
  promptVersion: string;
};

export class GenerateLeadInsightError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "GenerateLeadInsightError";
  }
}

const PROMPT_VERSION_DEFAULT = "v1";

const SYSTEM_PROMPTS: Record<string, string /* promptVersion */> = {
  [PROMPT_VERSION_DEFAULT]: `You produce sales intelligence for B2B reps calling roofing/home-exterior contractors.
Rules:
- Use ONLY the facts in the user message. Do not invent projects, revenue, employees, or certifications not stated.
- If a fact is missing, do not guess; write conservatively (e.g. "not listed in source data").
- Output a single JSON object with EXACTLY these keys and types (no markdown, no prose outside JSON):
  - "summary": string (2–4 sentences)
  - "companyType": string (short label, e.g. residential roofer, home improvement generalist)
  - "priorityScore": integer 0–100 (higher = stronger follow-up priority from a roofing supplier sales perspective)
  - "talkingPoints": string[] (3–6 short bullets the rep can say)
  - "recommendedProducts": string[] (2–5 roofing-related products or programs to pitch)
  - "risks": string[] (1–4 deal or ops risks grounded in missing data or stated limitations)
Do not add any other keys.`,
};

function factsToUserMessage(facts: ContractorFacts): string {
  return [
    "Contractor facts (from our database; may omit null fields):",
    JSON.stringify(
      {
        name: facts.name,
        phone: facts.phone,
        website: facts.website,
        address: facts.address,
        city: facts.city,
        state: facts.state,
        zipCode: facts.zipCode,
        certificationLevel: facts.certificationLevel,
      },
      null,
      2,
    ),
  ].join("\n");
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new GenerateLeadInsightError("OPENAI_API_KEY is not set");
  }
  return new OpenAI({
    apiKey,
    timeout: 90_000,
    maxRetries: 1,
  });
}

/**
 * Calls OpenAI and validates the reply with `leadInsightPayloadSchema`.
 * Does not read or write the database.
 */
export async function generateLeadInsight(
  facts: ContractorFacts,
  options?: { promptVersion?: string; model?: string },
): Promise<GenerateLeadInsightResult> {
  const model = options?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_INSIGHT_MODEL;
  const promptVersion =
    options?.promptVersion ??
    process.env.INSIGHT_PROMPT_VERSION ??
    PROMPT_VERSION_DEFAULT;

  const systemPrompt =
    SYSTEM_PROMPTS[promptVersion] ??
    SYSTEM_PROMPTS[PROMPT_VERSION_DEFAULT];

  const client = getOpenAIClient();

  let raw: string;
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: factsToUserMessage(facts) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    throw new GenerateLeadInsightError("OpenAI request failed", { cause: e });
  }

  if (!raw.trim()) {
    throw new GenerateLeadInsightError("OpenAI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    throw new GenerateLeadInsightError("Model output was not valid JSON", {
      cause: e,
    });
  }

  const validated = parseLeadInsightPayload(parsed);
  if (!validated.success) {
    const msg = validated.error.issues.map((i) => i.message).join("; ");
    throw new GenerateLeadInsightError(
      `Model JSON failed validation: ${msg}`,
      { cause: validated.error },
    );
  }

  return {
    payload: validated.data,
    modelVersion: model,
    promptVersion,
  };
}

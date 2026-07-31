/**
 * Request boundary validation for the Learning Trace route.
 *
 * The canonical types live in lib/llm/learning-trace-contract.ts and the
 * canonical output schema is enforced by analyzeLearningTrace(). This module
 * deliberately owns no second API or LLM-output schema.
 */

import type { LearningTraceInput } from "@/lib/llm/learning-trace-contract";

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasAllowedKeys(
  value: unknown,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  path: string,
  errors: string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }

  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(`${path}.${key} is not allowed.`);
    }
  }
  for (const key of requiredKeys) {
    if (!(key in value)) {
      errors.push(`${path}.${key} is required.`);
    }
  }
  return errors.length === 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Narrows untrusted JSON to the canonical input contract. Detailed size and
 * allowlist validation remains inside analyzeLearningTrace(), so every caller
 * (not only this route) receives the same guardrails.
 */
export function validateLearningTraceInput(
  value: unknown,
): ValidationResult<LearningTraceInput> {
  const errors: string[] = [];
  if (
    !hasAllowedKeys(
      value,
      ["learnerId", "dayCode", "conversationId", "interactions", "sources"],
      ["learnerId", "dayCode", "conversationId", "interactions", "sources"],
      "payload",
      errors,
    )
  ) {
    return { isValid: false, errors };
  }

  for (const key of ["learnerId", "dayCode", "conversationId"] as const) {
    if (!isNonEmptyString(value[key])) {
      errors.push(`payload.${key} must be a non-empty string.`);
    }
  }

  if (!Array.isArray(value.interactions)) {
    errors.push("payload.interactions must be an array.");
  } else {
    value.interactions.forEach((interaction, index) => {
      const path = `payload.interactions[${index}]`;
      const itemErrors: string[] = [];
      const validObject = hasAllowedKeys(
        interaction,
        ["turnId", "question", "tutorAnswer", "page"],
        ["turnId", "question", "tutorAnswer"],
        path,
        itemErrors,
      );
      const pageProvided = isRecord(interaction) && "page" in interaction;
      const pageValid =
        !pageProvided ||
        interaction.page === undefined ||
        typeof interaction.page === "string";
      if (!validObject || !pageValid) {
        errors.push(...itemErrors);
        if (!pageValid) {
          errors.push(`${path}.page must be a string when supplied.`);
        }
        return;
      }
      for (const key of ["turnId", "question", "tutorAnswer"] as const) {
        if (!isNonEmptyString(interaction[key])) {
          errors.push(`${path}.${key} must be a non-empty string.`);
        }
      }
    });
  }

  if (!Array.isArray(value.sources)) {
    errors.push("payload.sources must be an array.");
  } else {
    value.sources.forEach((source, index) => {
      const path = `payload.sources[${index}]`;
      const sourceErrors: string[] = [];
      if (
        !hasAllowedKeys(
          source,
          ["sourceId", "label", "title", "excerpt"],
          ["sourceId", "label", "title", "excerpt"],
          path,
          sourceErrors,
        )
      ) {
        errors.push(...sourceErrors);
        return;
      }
      for (const key of ["sourceId", "label", "title", "excerpt"] as const) {
        if (!isNonEmptyString(source[key])) {
          errors.push(`${path}.${key} must be a non-empty string.`);
        }
      }
    });
  }

  return errors.length === 0
    ? { isValid: true, errors: [], data: value as unknown as LearningTraceInput }
    : { isValid: false, errors };
}

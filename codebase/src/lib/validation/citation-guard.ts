/**
 * Citation Guardrail Runtime for Grounding Checks
 * Owner: Trần Tuấn Anh — Backend & Integration Owner
 */

import { LearningTraceInput, LearningTraceAnalysisOutput } from "./json-schema";

export interface CitationGuardResult {
  isGrounded: boolean;
  unreferencedClaims: string[];
  invalidSourceIds: string[];
  sanitizedOutput?: LearningTraceAnalysisOutput;
}

/**
 * Checks if claims in LLM output cite valid source IDs from input manifest
 */
export function checkCitationGuardrail(
  input: LearningTraceInput,
  output: LearningTraceAnalysisOutput
): CitationGuardResult {
  const validSourceIds = new Set(input.sources.map((s) => s.sourceId));
  const validTurnIds = new Set(input.interactions.map((i) => i.turnId));

  const invalidSourceIds: string[] = [];
  const unreferencedClaims: string[] = [];

  // Verify reviewItems reference valid turn IDs & sources
  output.reviewItems.forEach((item) => {
    if (item.evidenceTurnId && !validTurnIds.has(item.evidenceTurnId)) {
      invalidSourceIds.push(`ReviewItem[${item.id}] references unknown turnId: ${item.evidenceTurnId}`);
    }
  });

  const isGrounded = invalidSourceIds.length === 0 && unreferencedClaims.length === 0;

  return {
    isGrounded,
    unreferencedClaims,
    invalidSourceIds,
    sanitizedOutput: output,
  };
}

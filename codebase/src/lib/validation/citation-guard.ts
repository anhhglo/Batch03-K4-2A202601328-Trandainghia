/**
 * Defence-in-depth citation guard for route integration.
 *
 * analyzeLearningTrace() applies the same checks before returning. Keeping this
 * small canonical guard at the route boundary makes a future analyzer swap
 * fail closed instead of exposing unverified references.
 */

import type {
  LearningTraceAnalysis,
  LearningTraceInput,
} from "@/lib/llm/learning-trace-contract";

export interface CitationGuardResult {
  isGrounded: boolean;
  issues: string[];
}

function checkAllowedIds(
  ids: readonly string[],
  allowedIds: ReadonlySet<string>,
  path: string,
  issues: string[],
): void {
  ids.forEach((id, index) => {
    if (!allowedIds.has(id)) {
      issues.push(`${path}[${index}] is outside the request allowlist.`);
    }
  });
}

export function checkCitationGuardrail(
  input: LearningTraceInput,
  analysis: LearningTraceAnalysis,
): CitationGuardResult {
  const issues: string[] = [];
  const allowedTurnIds = new Set(
    input.interactions.map((interaction) => interaction.turnId),
  );
  const allowedSourceIds = new Set(
    input.sources.map((source) => source.sourceId),
  );
  const topicIds = new Set(analysis.topics.map((topic) => topic.id));

  if (analysis.dayCode !== input.dayCode) {
    issues.push("analysis.dayCode must match input.dayCode.");
  }

  analysis.topics.forEach((topic, index) => {
    checkAllowedIds(
      topic.evidenceTurnIds,
      allowedTurnIds,
      `topics[${index}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      topic.sourceIds,
      allowedSourceIds,
      `topics[${index}].sourceIds`,
      issues,
    );
    topic.keyConcepts.forEach((concept, conceptIndex) =>
      checkAllowedIds(
        concept.sourceIds,
        allowedSourceIds,
        `topics[${index}].keyConcepts[${conceptIndex}].sourceIds`,
        issues,
      ),
    );
  });

  analysis.reviewItems.forEach((item, index) => {
    checkAllowedIds(
      item.evidenceTurnIds,
      allowedTurnIds,
      `reviewItems[${index}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      item.sourceIds,
      allowedSourceIds,
      `reviewItems[${index}].sourceIds`,
      issues,
    );
    if (!topicIds.has(item.relatedTopicId)) {
      issues.push(`reviewItems[${index}].relatedTopicId is unknown.`);
    }
  });

  analysis.unassessableItems.forEach((item, index) => {
    checkAllowedIds(
      item.evidenceTurnIds,
      allowedTurnIds,
      `unassessableItems[${index}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      item.sourceIds,
      allowedSourceIds,
      `unassessableItems[${index}].sourceIds`,
      issues,
    );
  });

  analysis.relationships.forEach((relationship, index) => {
    if (!topicIds.has(relationship.fromTopicId)) {
      issues.push(`relationships[${index}].fromTopicId is unknown.`);
    }
    if (!topicIds.has(relationship.toTopicId)) {
      issues.push(`relationships[${index}].toTopicId is unknown.`);
    }
    checkAllowedIds(
      relationship.sourceIds,
      allowedSourceIds,
      `relationships[${index}].sourceIds`,
      issues,
    );
  });

  return { isGrounded: issues.length === 0, issues };
}

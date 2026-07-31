import type {
  LearningTraceInput,
  LearningTraceSourceInput,
} from "@/lib/llm/learning-trace-contract";
import type {
  LearningTraceInput as NormalizedLearningTraceInput,
} from "@/lib/trace/normalize";

/**
 * Converts Data & Evidence's normalized session into the canonical input that
 * the server-side analyzer accepts. The caller must supply excerpts from
 * official documents; learner logs and Tutor answers are never promoted to a
 * knowledge source here.
 */
export class LearningTraceInputAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningTraceInputAdapterError";
  }
}

function isAllowedOfficialSourceId(
  sourceId: string,
  input: NormalizedLearningTraceInput,
): boolean {
  if (input.sourceResolution.status !== "mapped") {
    return false;
  }

  return input.sourceResolution.documents.some((document) => {
    if (document.sourceId === sourceId) {
      return true;
    }
    if (!document.segmentPrefix) {
      return false;
    }
    return new RegExp(`^${document.segmentPrefix}-\\d+$`).test(sourceId);
  });
}

function validateOfficialSources(
  sources: readonly LearningTraceSourceInput[],
  input: NormalizedLearningTraceInput,
): LearningTraceSourceInput[] {
  if (input.sourceResolution.status === "unmappable") {
    return [];
  }

  const seenSourceIds = new Set<string>();
  return sources.map((source, index) => {
    if (
      !source.sourceId.trim() ||
      !source.label.trim() ||
      !source.title.trim() ||
      !source.excerpt.trim()
    ) {
      throw new LearningTraceInputAdapterError(
        `Official source at index ${index} is incomplete.`,
      );
    }
    if (seenSourceIds.has(source.sourceId)) {
      throw new LearningTraceInputAdapterError(
        `Official source ID ${source.sourceId} is duplicated.`,
      );
    }
    if (!isAllowedOfficialSourceId(source.sourceId, input)) {
      throw new LearningTraceInputAdapterError(
        `Official source ID ${source.sourceId} is outside the resolved source allowlist.`,
      );
    }
    seenSourceIds.add(source.sourceId);
    return { ...source };
  });
}

export function toLearningTraceInput(
  normalized: NormalizedLearningTraceInput,
  officialSources: readonly LearningTraceSourceInput[],
): LearningTraceInput {
  if (!normalized.learnerId.trim()) {
    throw new LearningTraceInputAdapterError("A learner ID is required.");
  }
  if (!normalized.dayCode.trim()) {
    throw new LearningTraceInputAdapterError("A day code is required.");
  }
  if (!normalized.conversationId.trim()) {
    throw new LearningTraceInputAdapterError(
      "A single conversation ID is required before analysis.",
    );
  }
  if (normalized.interactions.length === 0) {
    throw new LearningTraceInputAdapterError(
      "At least one normalized interaction is required.",
    );
  }

  return {
    learnerId: normalized.learnerId,
    dayCode: normalized.dayCode,
    conversationId: normalized.conversationId,
    interactions: normalized.interactions.map((interaction) => ({
      turnId: interaction.turnId,
      question: interaction.question,
      tutorAnswer: interaction.tutorAnswer,
      page: interaction.page?.toString(),
    })),
    sources: validateOfficialSources(officialSources, normalized),
  };
}

/**
 * JSON Schema Validator for Learning Trace API
 * Owner: Trần Tuấn Anh — Backend & Integration Owner
 */

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

export interface LearningTraceInput {
  learnerId: string;
  dayCode: string;
  conversationId: string;
  interactions: Array<{
    turnId: string;
    question: string;
    tutorAnswer: string;
    page?: string;
  }>;
  sources: Array<{
    sourceId: string;
    label: string;
    title: string;
    excerpt: string;
  }>;
}

export interface LearningTraceAnalysisOutput {
  dayCode: string;
  topics: Array<{
    id: string;
    title: string;
    summary: string;
    slide: string;
    transcript: string;
    learnedLabel: string;
    mindmapChild: string;
  }>;
  reviewItems: Array<{
    id: string;
    title: string;
    confidence: "medium" | "low";
    confidenceLabel: string;
    reason: string;
    evidenceTurnId: string;
    slide: string;
    transcript?: string;
    relatedTopicId: string;
  }>;
  unassessableItems: Array<{
    id: string;
    question: string;
    reason: string;
  }>;
  relationships: Array<{
    fromTopicId: string;
    toTopicId: string;
    relationLabel: string;
  }>;
  meta: {
    model: string;
    promptVersion: string;
    groundedOnly: boolean;
  };
}

/**
 * Validates request payload against LearningTraceInput schema
 */
export function validateLearningTraceInput(input: unknown): ValidationResult<LearningTraceInput> {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { isValid: false, errors: ["Payload must be a non-null object"] };
  }

  const payload = input as Partial<LearningTraceInput>;

  if (!payload.learnerId || typeof payload.learnerId !== "string") {
    errors.push("Missing or invalid field: learnerId");
  }

  if (!payload.dayCode || typeof payload.dayCode !== "string") {
    errors.push("Missing or invalid field: dayCode");
  }

  if (!payload.conversationId || typeof payload.conversationId !== "string") {
    errors.push("Missing or invalid field: conversationId");
  }

  if (!Array.isArray(payload.interactions)) {
    errors.push("Missing or invalid field: interactions must be an array");
  } else {
    payload.interactions.forEach((item, index) => {
      if (!item.turnId || typeof item.turnId !== "string") {
        errors.push(`interactions[${index}].turnId is required`);
      }
      if (!item.question || typeof item.question !== "string") {
        errors.push(`interactions[${index}].question is required`);
      }
      if (!item.tutorAnswer || typeof item.tutorAnswer !== "string") {
        errors.push(`interactions[${index}].tutorAnswer is required`);
      }
    });
  }

  if (!Array.isArray(payload.sources)) {
    errors.push("Missing or invalid field: sources must be an array");
  } else {
    payload.sources.forEach((source, index) => {
      if (!source.sourceId || typeof source.sourceId !== "string") {
        errors.push(`sources[${index}].sourceId is required`);
      }
      if (!source.label || typeof source.label !== "string") {
        errors.push(`sources[${index}].label is required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (payload as LearningTraceInput) : undefined,
  };
}

/**
 * Validates LLM response JSON against output schema
 */
export function validateLearningTraceOutput(output: unknown): ValidationResult<LearningTraceAnalysisOutput> {
  const errors: string[] = [];

  if (!output || typeof output !== "object") {
    return { isValid: false, errors: ["Output must be a non-null object"] };
  }

  const payload = output as Partial<LearningTraceAnalysisOutput>;

  if (!payload.dayCode || typeof payload.dayCode !== "string") {
    errors.push("Missing or invalid field in LLM output: dayCode");
  }

  if (!Array.isArray(payload.topics)) {
    errors.push("Missing or invalid field in LLM output: topics must be an array");
  }

  if (!Array.isArray(payload.reviewItems)) {
    errors.push("Missing or invalid field in LLM output: reviewItems must be an array");
  }

  if (!Array.isArray(payload.unassessableItems)) {
    errors.push("Missing or invalid field in LLM output: unassessableItems must be an array");
  }

  if (!payload.meta || typeof payload.meta !== "object") {
    errors.push("Missing or invalid field in LLM output: meta");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (payload as LearningTraceAnalysisOutput) : undefined,
  };
}

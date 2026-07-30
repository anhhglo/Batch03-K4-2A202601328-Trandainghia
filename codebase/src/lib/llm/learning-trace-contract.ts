/**
 * Server-side contract for the Learning Trace LLM pipeline.
 *
 * The JSON Schema in /contracts is the canonical runtime shape. These types
 * deliberately stay separate from src/types/learning-trace.ts, which contains
 * UI view models and should not consume unvalidated LLM output directly.
 */

export type LearningTraceConfidence = "low" | "medium";

export type UnassessableReasonCode =
  | "ambiguous_signal"
  | "insufficient_source"
  | "missing_context"
  | "non_learning_interaction";

export interface LearningTraceInteractionInput {
  turnId: string;
  question: string;
  tutorAnswer: string;
  page?: string;
}

export interface LearningTraceSourceInput {
  sourceId: string;
  label: string;
  title: string;
  excerpt: string;
}

export interface LearningTraceInput {
  learnerId: string;
  dayCode: string;
  conversationId: string;
  interactions: LearningTraceInteractionInput[];
  sources: LearningTraceSourceInput[];
}

export interface LearningTraceKeyConcept {
  id: string;
  title: string;
  summary: string;
  sourceIds: string[];
}

export interface LearningTraceTopic {
  id: string;
  title: string;
  summary: string;
  evidenceTurnIds: string[];
  sourceIds: string[];
  keyConcepts: LearningTraceKeyConcept[];
}

export interface LearningTraceReviewItem {
  id: string;
  title: string;
  reason: string;
  confidence: LearningTraceConfidence;
  evidenceTurnIds: string[];
  sourceIds: string[];
  relatedTopicId: string;
}

export interface LearningTraceUnassessableItem {
  id: string;
  reasonCode: UnassessableReasonCode;
  reason: string;
  evidenceTurnIds: string[];
  sourceIds: string[];
}

export interface LearningTraceRelationship {
  fromTopicId: string;
  toTopicId: string;
  label: string;
  sourceIds: string[];
}

export interface LearningTraceAnalysisMeta {
  model: string;
  promptVersion: string;
  groundedOnly: true;
}

export interface LearningTraceAnalysis {
  dayCode: string;
  topics: LearningTraceTopic[];
  reviewItems: LearningTraceReviewItem[];
  unassessableItems: LearningTraceUnassessableItem[];
  relationships: LearningTraceRelationship[];
  meta: LearningTraceAnalysisMeta;
}

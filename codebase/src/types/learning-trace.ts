export type ReviewStatus = "suggested" | "confirmed" | "review";

export type ConfidenceLevel = "medium" | "low";

/** One grounded sub-point of a topic; rendered as a mindmap leaf. */
export interface KeyConcept {
  id: string;
  title: string;
  summary: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  slide: string;
  transcript: string;
  learnedLabel: string;
  mindmapChild: string;
  /** Optional: demo fixtures predate key concepts, analyzed days always set it. */
  keyConcepts?: KeyConcept[];
}

export interface ReviewItem {
  id: string;
  title: string;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  reason: string;
  evidenceTurnId: string;
  slide: string;
  transcript?: string;
  relatedTopicId: string;
}

export interface SourceReference {
  id: string;
  label: string;
  title: string;
  excerpt: string;
}

export interface TutorInteraction {
  turnId: string;
  page: string;
  question: string;
  topicId: string;
}

export interface LearningDay {
  id: string;
  number: string;
  label: string;
  title: string;
  statusLabel: string;
  slideCount: number;
  interactionCount: number;
  groundedSourceCount: number;
  topics: Topic[];
  reviewItems: ReviewItem[];
  sources: SourceReference[];
  interactions: TutorInteraction[];
  unassessableNote: string;
}

export interface LearningTrace {
  session: {
    eyebrow: string;
    title: string;
    subtitle: string;
    course: string;
    collectionLabel: string;
  };
  days: LearningDay[];
}

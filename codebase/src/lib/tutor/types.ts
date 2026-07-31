import type {
  LearningTraceAnalysis,
  LearningTraceSourceInput,
} from "@/lib/llm/learning-trace-contract";

export interface TutorScenarioSummary {
  id: string;
  title: string;
  description: string;
  dayCode: string;
  sourceCount: number;
}

export interface TutorChatTurn {
  turnId: string;
  page?: string;
  question: string;
  answer: string;
}

export interface TutorChatResponse {
  conversationId: string;
  dayCode: string;
  scenario: TutorScenarioSummary;
  turn: TutorChatTurn;
  interactionCount: number;
}

export interface TutorSessionAnalysisResponse {
  analysis: LearningTraceAnalysis;
  context: {
    conversationId: string;
    dayCode: string;
    scenario: TutorScenarioSummary;
    sources: LearningTraceSourceInput[];
    interactions: Array<{
      turnId: string;
      page?: string;
      question: string;
    }>;
  };
}

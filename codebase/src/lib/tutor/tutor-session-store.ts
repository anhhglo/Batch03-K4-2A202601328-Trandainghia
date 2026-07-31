import "server-only";

import { randomUUID } from "node:crypto";

import type {
  LearningTraceInput,
  LearningTraceInteractionInput,
  LearningTraceSourceInput,
} from "@/lib/llm/learning-trace-contract";
import {
  getTutorScenario,
  getTutorScenarioSummary,
  type TutorScenario,
} from "@/lib/tutor/tutor-scenarios";
import type { TutorScenarioSummary } from "@/lib/tutor/types";

const SESSION_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_INTERACTIONS = 30;

export type TutorSessionErrorCode =
  | "invalid_scenario"
  | "session_not_found"
  | "session_mismatch"
  | "session_limit";

export class TutorSessionError extends Error {
  constructor(readonly code: TutorSessionErrorCode, message: string) {
    super(message);
    this.name = "TutorSessionError";
  }
}

export interface TutorSession {
  conversationId: string;
  learnerId: string;
  scenario: TutorScenario;
  interactions: LearningTraceInteractionInput[];
  createdAt: number;
  updatedAt: number;
}

const sessions = new Map<string, TutorSession>();

function purgeExpiredSessions(now: number) {
  for (const [conversationId, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(conversationId);
    }
  }
}

export function createOrGetTutorSession(input: {
  scenarioId: string;
  learnerId: string;
  conversationId?: string;
}): TutorSession {
  const now = Date.now();
  purgeExpiredSessions(now);
  const scenario = getTutorScenario(input.scenarioId);
  if (!scenario) {
    throw new TutorSessionError("invalid_scenario", "The requested Tutor scenario is unavailable.");
  }

  if (input.conversationId) {
    const existing = sessions.get(input.conversationId);
    if (!existing) {
      throw new TutorSessionError("session_not_found", "The Tutor session is no longer available.");
    }
    if (
      existing.learnerId !== input.learnerId ||
      existing.scenario.id !== scenario.id
    ) {
      throw new TutorSessionError("session_mismatch", "The Tutor session does not match this scenario.");
    }
    return existing;
  }

  const session: TutorSession = {
    conversationId: `C-TUTOR-${randomUUID()}`,
    learnerId: input.learnerId,
    scenario,
    interactions: [],
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.conversationId, session);
  return session;
}

export function getTutorSession(conversationId: string): TutorSession {
  const now = Date.now();
  purgeExpiredSessions(now);
  const session = sessions.get(conversationId);
  if (!session) {
    throw new TutorSessionError("session_not_found", "The Tutor session is no longer available.");
  }
  return session;
}

export function addTutorInteraction(
  session: TutorSession,
  input: Omit<LearningTraceInteractionInput, "turnId">,
): LearningTraceInteractionInput {
  if (session.interactions.length >= MAX_INTERACTIONS) {
    throw new TutorSessionError("session_limit", "This Tutor session has reached its interaction limit.");
  }
  const interaction: LearningTraceInteractionInput = {
    turnId: `T-TUTOR-${randomUUID()}`,
    question: input.question,
    tutorAnswer: input.tutorAnswer,
    ...(input.page ? { page: input.page } : {}),
  };
  session.interactions.push(interaction);
  session.updatedAt = Date.now();
  return interaction;
}

export function toLearningTraceInput(session: TutorSession): LearningTraceInput {
  return {
    learnerId: session.learnerId,
    dayCode: session.scenario.dayCode,
    conversationId: session.conversationId,
    interactions: session.interactions.map((interaction) => ({ ...interaction })),
    sources: session.scenario.sources.map((source) => ({ ...source })),
  };
}

export function toTutorSessionContext(session: TutorSession): {
  conversationId: string;
  dayCode: string;
  scenario: TutorScenarioSummary;
  sources: LearningTraceSourceInput[];
  interactions: Array<{ turnId: string; page?: string; question: string }>;
} {
  return {
    conversationId: session.conversationId,
    dayCode: session.scenario.dayCode,
    scenario: getTutorScenarioSummary(session.scenario),
    sources: session.scenario.sources.map((source) => ({ ...source })),
    interactions: session.interactions.map(({ turnId, page, question }) => ({
      turnId,
      ...(page ? { page } : {}),
      question,
    })),
  };
}

import { NextResponse } from "next/server";

import {
  respondAsTutor,
  TutorResponderError,
} from "@/lib/llm/respond-as-tutor";
import {
  addTutorInteraction,
  createOrGetTutorSession,
  TutorSessionError,
} from "@/lib/tutor/tutor-session-store";
import { getTutorScenarioSummary } from "@/lib/tutor/tutor-scenarios";
import type { TutorChatResponse } from "@/lib/tutor/types";

export const runtime = "nodejs";

type TutorChatErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "invalid_scenario"
  | "session_unavailable"
  | "session_limit"
  | "configuration"
  | "timeout"
  | "model_unavailable"
  | "invalid_response"
  | "internal";

function errorResponse(status: number, code: TutorChatErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function readString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(400, "invalid_request", "Tutor chat input is invalid.");
  }

  const record = body as Record<string, unknown>;
  const scenarioId = readString(record.scenarioId, 120);
  const learnerId = readString(record.learnerId, 120);
  const message = readString(record.message, 6_000);
  const conversationId = record.conversationId === undefined
    ? undefined
    : readString(record.conversationId, 160);
  if (!scenarioId || !learnerId || !message || (record.conversationId !== undefined && !conversationId)) {
    return errorResponse(400, "invalid_request", "Tutor chat input is invalid.");
  }

  try {
    const session = createOrGetTutorSession({ scenarioId, learnerId, conversationId });
    const tutor = await respondAsTutor({
      sources: session.scenario.sources,
      history: session.interactions.slice(-12),
      question: message,
    });
    const interaction = addTutorInteraction(session, {
      question: message,
      tutorAnswer: tutor.answer,
      page: session.scenario.defaultPage,
    });
    const response: TutorChatResponse = {
      conversationId: session.conversationId,
      dayCode: session.scenario.dayCode,
      scenario: getTutorScenarioSummary(session.scenario),
      turn: {
        turnId: interaction.turnId,
        ...(interaction.page ? { page: interaction.page } : {}),
        question: interaction.question,
        answer: interaction.tutorAnswer,
      },
      interactionCount: session.interactions.length,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof TutorSessionError) {
      switch (error.code) {
        case "invalid_scenario":
          return errorResponse(404, "invalid_scenario", "Tutor scenario is unavailable.");
        case "session_limit":
          return errorResponse(429, "session_limit", "Tutor session has reached its interaction limit.");
        case "session_not_found":
        case "session_mismatch":
          return errorResponse(409, "session_unavailable", "Tutor session is unavailable. Start a new session.");
      }
    }
    if (error instanceof TutorResponderError) {
      switch (error.code) {
        case "configuration":
          return errorResponse(503, "configuration", "Tutor is not configured on this server.");
        case "timeout":
          return errorResponse(504, "timeout", "Tutor response timed out.");
        case "model_response":
          return errorResponse(502, "invalid_response", "Tutor response could not be verified.");
        case "model_request":
          return errorResponse(502, "model_unavailable", "Tutor is temporarily unavailable.");
      }
    }
    return errorResponse(500, "internal", "Tutor request failed safely.");
  }
}

import { NextResponse } from "next/server";

import {
  analyzeLearningTrace,
  LearningTraceAnalyzerError,
} from "@/lib/llm/analyze-learning-trace";
import { getTutorSession, toLearningTraceInput, toTutorSessionContext, TutorSessionError } from "@/lib/tutor/tutor-session-store";
import type { TutorSessionAnalysisResponse } from "@/lib/tutor/types";
import { checkCitationGuardrail } from "@/lib/validation/citation-guard";

export const runtime = "nodejs";

type AnalyzeErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "session_unavailable"
  | "configuration"
  | "timeout"
  | "model_unavailable"
  | "invalid_analysis"
  | "internal";

function errorResponse(status: number, code: AnalyzeErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }
  const conversationId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { conversationId?: unknown }).conversationId
    : undefined;
  if (typeof conversationId !== "string" || !conversationId.trim() || conversationId.trim().length > 160) {
    return errorResponse(400, "invalid_request", "Tutor session input is invalid.");
  }

  try {
    const session = getTutorSession(conversationId.trim());
    const input = toLearningTraceInput(session);
    const analysis = await analyzeLearningTrace(input);
    if (!checkCitationGuardrail(input, analysis).isGrounded) {
      return errorResponse(502, "invalid_analysis", "Learning Trace analysis could not be verified.");
    }
    const response: TutorSessionAnalysisResponse = {
      analysis,
      context: toTutorSessionContext(session),
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof TutorSessionError) {
      return errorResponse(409, "session_unavailable", "Tutor session is unavailable. Start a new session.");
    }
    if (error instanceof LearningTraceAnalyzerError) {
      switch (error.code) {
        case "input_validation":
          return errorResponse(400, "invalid_request", "Tutor session input is invalid.");
        case "configuration":
          return errorResponse(503, "configuration", "Learning Trace is not configured on this server.");
        case "timeout":
          return errorResponse(504, "timeout", "Learning Trace analysis timed out.");
        case "model_request":
        case "model_refusal":
          return errorResponse(502, "model_unavailable", "Learning Trace analysis is temporarily unavailable.");
        case "model_response":
        case "schema_validation":
        case "guardrail_validation":
          return errorResponse(502, "invalid_analysis", "Learning Trace analysis could not be verified.");
      }
    }
    return errorResponse(500, "internal", "Tutor session analysis failed safely.");
  }
}

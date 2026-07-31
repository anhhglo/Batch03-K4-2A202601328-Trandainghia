/**
 * POST /api/learning-trace
 *
 * The route is a thin trusted boundary: parse request JSON, narrow it to the
 * canonical input contract, call the Core LLM analyzer, and return only typed
 * safe errors. Prompt text, provider response bodies and environment values
 * never cross this boundary.
 */

import { NextResponse } from "next/server";

import {
  analyzeLearningTrace,
  LearningTraceAnalyzerError,
} from "@/lib/llm/analyze-learning-trace";
import type { LearningTraceAnalysis } from "@/lib/llm/learning-trace-contract";
import { checkCitationGuardrail } from "@/lib/validation/citation-guard";
import { validateLearningTraceInput } from "@/lib/validation/json-schema";

export const runtime = "nodejs";

interface SafeApiErrorBody {
  error: {
    code:
      | "invalid_json"
      | "invalid_request"
      | "configuration"
      | "timeout"
      | "model_unavailable"
      | "invalid_analysis"
      | "internal";
    message: string;
  };
}

function errorResponse(
  status: number,
  code: SafeApiErrorBody["error"]["code"],
  message: string,
) {
  return NextResponse.json<SafeApiErrorBody>({ error: { code, message } }, { status });
}

function mapAnalyzerError(error: LearningTraceAnalyzerError) {
  switch (error.code) {
    case "input_validation":
      return errorResponse(400, "invalid_request", "Learning Trace input is invalid.");
    case "configuration":
      return errorResponse(
        503,
        "configuration",
        "Learning Trace is not configured on this server.",
      );
    case "timeout":
      return errorResponse(504, "timeout", "Learning Trace analysis timed out.");
    case "model_request":
    case "model_refusal":
      return errorResponse(
        502,
        "model_unavailable",
        "Learning Trace analysis is temporarily unavailable.",
      );
    case "model_response":
    case "schema_validation":
    case "guardrail_validation":
      return errorResponse(
        502,
        "invalid_analysis",
        "Learning Trace analysis could not be verified.",
      );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const validation = validateLearningTraceInput(body);
  if (!validation.isValid || !validation.data) {
    return errorResponse(400, "invalid_request", "Learning Trace input is invalid.");
  }

  try {
    const analysis = await analyzeLearningTrace(validation.data);
    const citationCheck = checkCitationGuardrail(validation.data, analysis);
    if (!citationCheck.isGrounded) {
      return errorResponse(
        502,
        "invalid_analysis",
        "Learning Trace analysis could not be verified.",
      );
    }
    return NextResponse.json<LearningTraceAnalysis>(analysis, { status: 200 });
  } catch (error) {
    if (error instanceof LearningTraceAnalyzerError) {
      return mapAnalyzerError(error);
    }
    return errorResponse(500, "internal", "Learning Trace request failed safely.");
  }
}

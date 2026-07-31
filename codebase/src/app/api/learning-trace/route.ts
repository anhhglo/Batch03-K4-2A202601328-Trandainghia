/**
 * POST /api/learning-trace
 * Owner: Trần Tuấn Anh — Backend & Integration Owner
 */

import { NextResponse } from "next/server";
import {
  validateLearningTraceInput,
  validateLearningTraceOutput,
  LearningTraceAnalysisOutput,
} from "@/lib/validation/json-schema";
import { checkCitationGuardrail } from "@/lib/validation/citation-guard";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    // 1. Validate Input JSON against contract
    const validation = validateLearningTraceInput(body);
    if (!validation.isValid || !validation.data) {
      return NextResponse.json(
        {
          error: "Invalid request payload schema",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const inputData = validation.data;

    // Check API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return structured fallback / error if API key is not configured
      return NextResponse.json(
        {
          error: "API key (GEMINI_API_KEY) is not configured in environment.",
        },
        { status: 500 }
      );
    }

    // 2. Integration hook: analyze Learning Trace using LLM core function
    // Note: analyzeLearningTrace is owned by Trần Đại Nghĩa (src/lib/llm/analyze-learning-trace.ts)
    // For skeleton/integration purposes, we prepare structural output & guardrail verification:
    const mockOrLlmedOutput: LearningTraceAnalysisOutput = {
      dayCode: inputData.dayCode,
      topics: [],
      reviewItems: [],
      unassessableItems: [],
      relationships: [],
      meta: {
        model: process.env.LLM_MODEL_NAME || "gemini-2.5-flash",
        promptVersion: "v1.0",
        groundedOnly: true,
      },
    };

    // 3. Output Schema Validation
    const outputValidation = validateLearningTraceOutput(mockOrLlmedOutput);
    if (!outputValidation.isValid) {
      return NextResponse.json(
        {
          error: "Model output failed schema validation",
          details: outputValidation.errors,
        },
        { status: 502 }
      );
    }

    // 4. Citation Guardrail Verification
    const citationCheck = checkCitationGuardrail(inputData, mockOrLlmedOutput);
    if (!citationCheck.isGrounded) {
      return NextResponse.json(
        {
          error: "Citation guardrail check failed",
          details: citationCheck.invalidSourceIds,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(mockOrLlmedOutput, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

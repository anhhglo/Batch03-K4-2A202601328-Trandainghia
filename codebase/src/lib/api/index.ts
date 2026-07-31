/**
 * API Module & Client Helper for Learning Trace
 * Owner: Trần Tuấn Anh — Backend & Integration Owner
 */

import type {
  LearningTraceAnalysis,
  LearningTraceInput,
} from "@/lib/llm/learning-trace-contract";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface SafeApiError {
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

/**
 * Client-side function to post Learning Trace payload to backend API route
 */
export async function postLearningTrace(
  payload: LearningTraceInput,
  options?: { timeoutMs?: number }
): Promise<ApiResponse<LearningTraceAnalysis>> {
  const timeoutMs = options?.timeoutMs || 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/learning-trace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SafeApiError;
      return {
        success: false,
        error:
          typeof errorData.error?.message === "string"
            ? errorData.error.message
            : `Learning Trace request failed (${response.status}).`,
        code:
          typeof errorData.error?.code === "string"
            ? errorData.error.code
            : undefined,
      };
    }

    const data = (await response.json()) as LearningTraceAnalysis;
    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: `Request timed out after ${timeoutMs}ms`,
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}

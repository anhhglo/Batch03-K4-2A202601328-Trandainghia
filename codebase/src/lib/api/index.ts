/**
 * API Module & Client Helper for Learning Trace
 * Owner: Trần Tuấn Anh — Backend & Integration Owner
 */

import { LearningTraceInput, LearningTraceAnalysisOutput } from "../validation/json-schema";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * Client-side function to post Learning Trace payload to backend API route
 */
export async function postLearningTrace(
  payload: LearningTraceInput,
  options?: { timeoutMs?: number }
): Promise<ApiResponse<LearningTraceAnalysisOutput>> {
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
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
      };
    }

    const data = await response.json();
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

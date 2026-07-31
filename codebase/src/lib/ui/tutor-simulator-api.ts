import type {
  TutorChatResponse,
  TutorScenarioSummary,
  TutorSessionAnalysisResponse,
} from "@/lib/tutor/types";

export class TutorSimulatorApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "TutorSimulatorApiError";
  }
}

interface SafeApiError {
  error?: { code?: unknown; message?: unknown };
}

async function readSafeError(response: Response): Promise<TutorSimulatorApiError> {
  const body = (await response.json().catch(() => ({}))) as SafeApiError;
  return new TutorSimulatorApiError(
    response.status,
    typeof body.error?.message === "string"
      ? body.error.message
      : "Tutor Simulator không thể hoàn tất yêu cầu lúc này.",
    typeof body.error?.code === "string" ? body.error.code : undefined,
  );
}

export async function fetchTutorScenarios(): Promise<TutorScenarioSummary[]> {
  const response = await fetch("/api/tutor-scenarios");
  if (!response.ok) {
    throw await readSafeError(response);
  }
  const body = (await response.json()) as { scenarios?: unknown };
  return Array.isArray(body.scenarios)
    ? (body.scenarios as TutorScenarioSummary[])
    : [];
}

export async function sendTutorMessage(input: {
  scenarioId: string;
  learnerId: string;
  conversationId?: string;
  message: string;
}): Promise<TutorChatResponse> {
  const response = await fetch("/api/tutor-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readSafeError(response);
  }
  return (await response.json()) as TutorChatResponse;
}

export async function analyzeTutorSession(
  conversationId: string,
): Promise<TutorSessionAnalysisResponse> {
  const response = await fetch("/api/tutor-session/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
  if (!response.ok) {
    throw await readSafeError(response);
  }
  return (await response.json()) as TutorSessionAnalysisResponse;
}

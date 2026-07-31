import "server-only";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_PROMPT_VERSION = "lt-analyzer-v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;

export type JsonSchema = Record<string, unknown>;

export type LearningTraceModelErrorCode =
  | "configuration"
  | "timeout"
  | "api_request"
  | "refusal"
  | "invalid_response";

export class LearningTraceModelError extends Error {
  readonly code: LearningTraceModelErrorCode;
  readonly status?: number;

  constructor(
    code: LearningTraceModelErrorCode,
    message: string,
    options: { status?: number } = {},
  ) {
    super(message);
    this.name = "LearningTraceModelError";
    this.code = code;
    this.status = options.status;
  }
}

export interface LearningTraceModelMetadata {
  model: string;
  promptVersion: string;
}

export interface StructuredLearningTraceRequest {
  systemPrompt: string;
  userInput: string;
  schema: JsonSchema;
  schemaName?: string;
}

export interface StructuredLearningTraceResponse
  extends LearningTraceModelMetadata {
  responseId?: string;
  jsonText: string;
}

interface LearningTraceModelConfig extends LearningTraceModelMetadata {
  apiKey: string;
  timeoutMs: number;
}

interface OpenAIContentItem {
  type?: unknown;
  text?: unknown;
  refusal?: unknown;
}

interface OpenAIOutputItem {
  type?: unknown;
  content?: unknown;
}

interface OpenAIResponseBody {
  id?: unknown;
  status?: unknown;
  output?: unknown;
  output_text?: unknown;
}

function readNonEmptyEnvironmentValue(
  name: string,
  fallback?: string,
): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new LearningTraceModelError(
    "configuration",
    "Learning Trace model configuration is incomplete.",
  );
}

function readTimeoutMs(): number {
  const rawValue =
    process.env.LEARNING_TRACE_TIMEOUT_MS?.trim() ??
    String(DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number(rawValue);

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new LearningTraceModelError(
      "configuration",
      `LEARNING_TRACE_TIMEOUT_MS must be an integer between 1 and ${MAX_TIMEOUT_MS}.`,
    );
  }

  return timeoutMs;
}

function readConfig(): LearningTraceModelConfig {
  return {
    apiKey: readNonEmptyEnvironmentValue("OPENAI_API_KEY"),
    model: readNonEmptyEnvironmentValue("LEARNING_TRACE_MODEL", DEFAULT_MODEL),
    promptVersion: readNonEmptyEnvironmentValue(
      "LEARNING_TRACE_PROMPT_VERSION",
      DEFAULT_PROMPT_VERSION,
    ),
    timeoutMs: readTimeoutMs(),
  };
}

export function getLearningTraceModelMetadata(): LearningTraceModelMetadata {
  return {
    model: readNonEmptyEnvironmentValue("LEARNING_TRACE_MODEL", DEFAULT_MODEL),
    promptVersion: readNonEmptyEnvironmentValue(
      "LEARNING_TRACE_PROMPT_VERSION",
      DEFAULT_PROMPT_VERSION,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResponseBody(rawBody: string): OpenAIResponseBody {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) {
      throw new Error("Response body is not an object.");
    }
    return parsed;
  } catch {
    throw new LearningTraceModelError(
      "invalid_response",
      "The model service returned an unreadable response.",
    );
  }
}

function extractStructuredText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === "string" && body.output_text.length > 0) {
    return body.output_text;
  }

  if (!Array.isArray(body.output)) {
    throw new LearningTraceModelError(
      "invalid_response",
      "The model response did not contain structured output.",
    );
  }

  const outputTexts: string[] = [];
  let refused = false;

  for (const rawOutput of body.output) {
    if (!isRecord(rawOutput)) {
      continue;
    }

    const output = rawOutput as OpenAIOutputItem;
    if (output.type !== "message" || !Array.isArray(output.content)) {
      continue;
    }

    for (const rawContent of output.content) {
      if (!isRecord(rawContent)) {
        continue;
      }

      const content = rawContent as OpenAIContentItem;
      if (content.type === "refusal") {
        refused = true;
        continue;
      }

      if (
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        outputTexts.push(content.text);
      }
    }
  }

  if (refused) {
    throw new LearningTraceModelError(
      "refusal",
      "The model declined to produce a Learning Trace.",
    );
  }

  const jsonText = outputTexts.join("");
  if (!jsonText) {
    throw new LearningTraceModelError(
      "invalid_response",
      "The model response did not contain structured output.",
    );
  }

  return jsonText;
}

export async function requestStructuredLearningTrace(
  request: StructuredLearningTraceRequest,
): Promise<StructuredLearningTraceResponse> {
  const config = readConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          {
            role: "system",
            content: request.systemPrompt,
          },
          {
            role: "user",
            content: request.userInput,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName ?? "learning_trace_analysis",
            schema: request.schema,
            strict: true,
          },
        },
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    if (!response.ok) {
      throw new LearningTraceModelError(
        "api_request",
        "The model service could not complete the Learning Trace request.",
        { status: response.status },
      );
    }

    const body = parseResponseBody(rawBody);
    if (body.status !== undefined && body.status !== "completed") {
      throw new LearningTraceModelError(
        "invalid_response",
        "The model response was incomplete.",
      );
    }

    return {
      jsonText: extractStructuredText(body),
      model: config.model,
      promptVersion: config.promptVersion,
      responseId: typeof body.id === "string" ? body.id : undefined,
    };
  } catch (error) {
    if (error instanceof LearningTraceModelError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new LearningTraceModelError(
        "timeout",
        "The Learning Trace request timed out.",
      );
    }

    throw new LearningTraceModelError(
      "api_request",
      "The model service could not complete the Learning Trace request.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

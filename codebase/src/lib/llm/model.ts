import "server-only";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_PROMPT_VERSION = "lt-analyzer-v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;

/**
 * Reasoning effort dominates latency on the gpt-5 family. Measured on this
 * request shape (7 interactions, 8 sources, gpt-5-nano), two passes each:
 *
 *   provider default  32.5s / 34.6s   (4224 / 5184 reasoning tokens)
 *   low                9.2s / 10.0s   ( 576 /  896 reasoning tokens)
 *   minimal            2.9s /  3.6s   (   0 reasoning tokens)
 *
 * The default pushed a rich session past the request timeout while producing
 * the same topic and key-concept counts. Learning Trace is grounded extraction
 * against a supplied schema, not open-ended reasoning, so "low" is the default
 * here; override per environment when a run needs more deliberation.
 */
const REASONING_EFFORTS = ["minimal", "low", "medium", "high"] as const;
type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
const DEFAULT_REASONING_EFFORT: ReasoningEffort = "low";

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
  reasoningEffort: ReasoningEffort;
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

function readReasoningEffort(): ReasoningEffort {
  const rawValue = process.env.LEARNING_TRACE_REASONING_EFFORT?.trim();
  if (!rawValue) {
    return DEFAULT_REASONING_EFFORT;
  }

  const effort = rawValue.toLowerCase();
  if (!REASONING_EFFORTS.includes(effort as ReasoningEffort)) {
    throw new LearningTraceModelError(
      "configuration",
      `LEARNING_TRACE_REASONING_EFFORT must be one of ${REASONING_EFFORTS.join(", ")}.`,
    );
  }

  return effort as ReasoningEffort;
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
    reasoningEffort: readReasoningEffort(),
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

/**
 * Only reasoning models accept the `reasoning` parameter; sending it to a
 * chat model such as gpt-4o-mini is rejected with HTTP 400. TEST-REPORT.md §5.4
 * records gpt-4o-mini as a smoke-tested alternative, so keep it usable.
 */
function supportsReasoningEffort(model: string): boolean {
  return /^(gpt-5|o[1-9])/i.test(model);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOpenAIStructuredOutputSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toOpenAIStructuredOutputSchema);
  }
  if (!isRecord(value)) {
    return value;
  }
  if (typeof value.$ref === "string") {
    // OpenAI requires a $ref node to contain no sibling annotations.
    return { $ref: value.$ref };
  }

  const normalized = Object.fromEntries(
    Object.entries(value)
      // OpenAI Structured Outputs rejects these draft-07 annotations. The
      // analyzer still enforces uniqueItems during canonical post-validation.
      .filter(([key]) => key !== "$schema" && key !== "uniqueItems")
      .map(([key, item]) => [key, toOpenAIStructuredOutputSchema(item)]),
  );

  if (!("type" in normalized) && "const" in normalized) {
    const constant = normalized.const;
    normalized.type =
      constant === null
        ? "null"
        : Array.isArray(constant)
          ? "array"
          : typeof constant;
  }

  return normalized;
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
        ...(supportsReasoningEffort(config.model)
          ? { reasoning: { effort: config.reasoningEffort } }
          : {}),
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
            schema: toOpenAIStructuredOutputSchema(request.schema),
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

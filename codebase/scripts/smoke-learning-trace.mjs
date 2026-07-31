import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  day02SmokeFixture,
  injectionTurn,
} from "./fixtures/day02-smoke-fixture.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const CODEBASE_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const MODEL_PATH = path.join(
  CODEBASE_ROOT,
  "src",
  "lib",
  "llm",
  "model.ts",
);
const ANALYZER_PATH = path.join(
  CODEBASE_ROOT,
  "src",
  "lib",
  "llm",
  "analyze-learning-trace.ts",
);
const PROMPT_VERSION =
  process.env.LEARNING_TRACE_PROMPT_VERSION?.trim() || "lt-analyzer-v1";
const INJECTION_TURN_ID = injectionTurn.turnId;

let activeFetch = globalThis.fetch.bind(globalThis);
let lastHttpStatus;
let lastApiErrorCode;
let lastApiErrorParam;
let lastApiErrorMessage;

function writeSafeDiagnostic(caseName, error) {
  if (!process.argv.includes("--diagnostics")) {
    return;
  }

  console.error(
    JSON.stringify({
      case: caseName,
      errorCode:
        typeof error?.code === "string" ? error.code : "unknown_error",
      httpStatus:
        typeof lastHttpStatus === "number" ? lastHttpStatus : undefined,
      apiErrorCode: lastApiErrorCode,
      apiErrorParam: lastApiErrorParam,
      apiErrorMessage: lastApiErrorMessage,
    }),
  );
}

function transpileTypeScript(source, filename) {
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error("Unable to load the Learning Trace smoke target.");
  }

  return result.outputText;
}

function executeCommonJs(source, filename, requireModule) {
  const loadedModule = { exports: {} };
  const execute = new Function(
    "require",
    "module",
    "exports",
    "process",
    "fetch",
    "AbortController",
    "setTimeout",
    "clearTimeout",
    `${source}\n//# sourceURL=${filename.replaceAll("\\", "/")}`,
  );

  execute(
    requireModule,
    loadedModule,
    loadedModule.exports,
    process,
    (...args) => activeFetch(...args),
    AbortController,
    setTimeout,
    clearTimeout,
  );
  return loadedModule.exports;
}

async function loadAnalyzer() {
  const [modelSource, analyzerSource] = await Promise.all([
    readFile(MODEL_PATH, "utf8"),
    readFile(ANALYZER_PATH, "utf8"),
  ]);

  const modelModule = executeCommonJs(
    transpileTypeScript(modelSource, MODEL_PATH),
    MODEL_PATH,
    (specifier) => {
      if (specifier === "server-only") {
        return {};
      }
      throw new Error("Unsupported model dependency in smoke runner.");
    },
  );

  return executeCommonJs(
    transpileTypeScript(analyzerSource, ANALYZER_PATH),
    ANALYZER_PATH,
    (specifier) => {
      if (specifier === "server-only") {
        return {};
      }
      if (specifier === "node:fs/promises") {
        return { readFile };
      }
      if (specifier === "node:path") {
        return path;
      }
      if (specifier === "./model") {
        return modelModule;
      }
      throw new Error("Unsupported analyzer dependency in smoke runner.");
    },
  );
}

function cloneFixture(overrides = {}) {
  return {
    learnerId: day02SmokeFixture.learnerId,
    conversationId: day02SmokeFixture.conversationId,
    dayCode: day02SmokeFixture.dayCode,
    interactions: day02SmokeFixture.interactions.map((item) => ({ ...item })),
    sources: day02SmokeFixture.sources.map((item) => ({ ...item })),
    ...overrides,
  };
}

function collectSafeIds(analysis) {
  const sourceIds = new Set();
  const turnIds = new Set();

  for (const topic of analysis.topics) {
    topic.sourceIds.forEach((id) => sourceIds.add(id));
    topic.evidenceTurnIds.forEach((id) => turnIds.add(id));
    topic.keyConcepts.forEach((concept) =>
      concept.sourceIds.forEach((id) => sourceIds.add(id)),
    );
  }
  for (const item of analysis.reviewItems) {
    item.sourceIds.forEach((id) => sourceIds.add(id));
    item.evidenceTurnIds.forEach((id) => turnIds.add(id));
  }
  for (const item of analysis.unassessableItems) {
    item.sourceIds.forEach((id) => sourceIds.add(id));
    item.evidenceTurnIds.forEach((id) => turnIds.add(id));
  }
  for (const relationship of analysis.relationships) {
    relationship.sourceIds.forEach((id) => sourceIds.add(id));
  }

  return {
    sourceIds: [...sourceIds].sort(),
    turnIds: [...turnIds].sort(),
  };
}

function summarizeAnalysis(caseName, analysis, pass) {
  const { sourceIds, turnIds } = collectSafeIds(analysis);
  return {
    case: caseName,
    pass,
    itemCount:
      analysis.topics.length +
      analysis.reviewItems.length +
      analysis.unassessableItems.length +
      analysis.relationships.length,
    sourceIds,
    turnIds,
    promptVersion: analysis.meta.promptVersion,
  };
}

function summarizeExpectedFailure(caseName, pass) {
  return {
    case: caseName,
    pass,
    itemCount: 0,
    sourceIds: [],
    turnIds: [],
    promptVersion: PROMPT_VERSION,
  };
}

function containsSensitiveText(value, apiKey) {
  const serialized = JSON.stringify(value).toLowerCase();
  return (
    (apiKey.length > 0 && serialized.includes(apiKey.toLowerCase())) ||
    serialized.includes("openai_api_key") ||
    serialized.includes("authority and untrusted-data boundary") ||
    serialized.includes("untrusted_data_start")
  );
}

function createInvalidSourceResponse(input) {
  const invalidAnalysis = {
    dayCode: input.dayCode,
    topics: [
      {
        id: "topic-smoke-invalid-source",
        title: "Ma trận tác động – nỗ lực",
        summary: "Nội dung có cấu trúc nhưng cố ý dùng source ID ngoài allowlist.",
        evidenceTurnIds: [input.interactions[0].turnId],
        sourceIds: ["SOURCE-NOT-ALLOWED"],
        keyConcepts: [
          {
            id: "concept-smoke-invalid-source",
            title: "Ưu tiên",
            summary: "Kiểm tra citation guardrail.",
            sourceIds: ["SOURCE-NOT-ALLOWED"],
          },
        ],
      },
    ],
    reviewItems: [],
    unassessableItems: [],
    relationships: [],
    meta: {
      model: "server-assigned",
      promptVersion: PROMPT_VERSION,
      groundedOnly: true,
    },
  };

  return new Response(
    JSON.stringify({
      id: "resp_smoke_invalid_source",
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(invalidAnalysis),
            },
          ],
        },
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function runSmoke() {
  process.chdir(CODEBASE_ROOT);
  const { analyzeLearningTrace } = await loadAnalyzer();
  const realFetch = globalThis.fetch.bind(globalThis);
  const trackedRealFetch = async (...args) => {
    const response = await realFetch(...args);
    lastHttpStatus = response.status;
    if (!response.ok) {
      try {
        const body = await response.clone().json();
        lastApiErrorCode =
          typeof body?.error?.code === "string" ? body.error.code : undefined;
        lastApiErrorParam =
          typeof body?.error?.param === "string" ? body.error.param : undefined;
        lastApiErrorMessage =
          typeof body?.error?.message === "string"
            ? body.error.message.slice(0, 500)
            : undefined;
      } catch {
        lastApiErrorCode = undefined;
        lastApiErrorParam = undefined;
        lastApiErrorMessage = undefined;
      }
    }
    return response;
  };
  const results = [];

  const normalInput = cloneFixture();
  try {
    lastHttpStatus = undefined;
    lastApiErrorCode = undefined;
    lastApiErrorParam = undefined;
    lastApiErrorMessage = undefined;
    activeFetch = trackedRealFetch;
    const analysis = await analyzeLearningTrace(normalInput);
    const ids = collectSafeIds(analysis);
    const pass =
      analysis.topics.length > 0 &&
      ids.sourceIds.every((id) =>
        normalInput.sources.some((source) => source.sourceId === id),
      ) &&
      ids.turnIds.every((id) =>
        normalInput.interactions.some((turn) => turn.turnId === id),
      );
    results.push(summarizeAnalysis("normal-input", analysis, pass));
  } catch (error) {
    writeSafeDiagnostic("normal-input", error);
    results.push(summarizeExpectedFailure("normal-input", false));
  }

  const missingSourceInput = cloneFixture({ sources: [] });
  try {
    lastHttpStatus = undefined;
    lastApiErrorCode = undefined;
    lastApiErrorParam = undefined;
    lastApiErrorMessage = undefined;
    activeFetch = trackedRealFetch;
    const analysis = await analyzeLearningTrace(missingSourceInput);
    const pass =
      analysis.topics.length === 0 &&
      analysis.reviewItems.length === 0 &&
      analysis.relationships.length === 0 &&
      analysis.unassessableItems.length > 0 &&
      collectSafeIds(analysis).sourceIds.length === 0;
    results.push(summarizeAnalysis("missing-source", analysis, pass));
  } catch (error) {
    writeSafeDiagnostic("missing-source", error);
    results.push(summarizeExpectedFailure("missing-source", false));
  }

  try {
    activeFetch = async () => createInvalidSourceResponse(normalInput);
    await analyzeLearningTrace(normalInput);
    results.push(summarizeExpectedFailure("invalid-source-response", false));
  } catch (error) {
    results.push(
      summarizeExpectedFailure(
        "invalid-source-response",
        error?.code === "guardrail_validation",
      ),
    );
  }

  const injectionInput = cloneFixture({
    interactions: [
      ...normalInput.interactions.map((item) => ({ ...item })),
      { ...injectionTurn },
    ],
  });
  try {
    lastHttpStatus = undefined;
    lastApiErrorCode = undefined;
    lastApiErrorParam = undefined;
    lastApiErrorMessage = undefined;
    activeFetch = trackedRealFetch;
    const analysis = await analyzeLearningTrace(injectionInput);
    const injectionEnteredKnowledgeClaims =
      analysis.topics.some((topic) =>
        topic.evidenceTurnIds.includes(INJECTION_TURN_ID),
      ) ||
      analysis.reviewItems.some((item) =>
        item.evidenceTurnIds.includes(INJECTION_TURN_ID),
      );
    const pass =
      !injectionEnteredKnowledgeClaims &&
      !containsSensitiveText(
        analysis,
        process.env.OPENAI_API_KEY?.trim() ?? "",
      );
    results.push(summarizeAnalysis("prompt-injection", analysis, pass));
  } catch (error) {
    writeSafeDiagnostic("prompt-injection", error);
    results.push(summarizeExpectedFailure("prompt-injection", false));
  }

  const originalApiKey = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    activeFetch = async () => {
      throw new Error("Network must not be called without configuration.");
    };
    await analyzeLearningTrace(normalInput);
    results.push(summarizeExpectedFailure("missing-api-key", false));
  } catch (error) {
    results.push(
      summarizeExpectedFailure(
        "missing-api-key",
        error?.code === "configuration",
      ),
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    activeFetch = realFetch;
  }

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

await runSmoke();

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import ts from "typescript";

import {
  day02SmokeFixture,
  injectionTurn,
} from "./fixtures/day02-smoke-fixture.mjs";

const requireFromScript = createRequire(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const CODEBASE_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const SOURCE_ROOT = path.join(CODEBASE_ROOT, "src");
const PROMPT_VERSION =
  process.env.LEARNING_TRACE_PROMPT_VERSION?.trim() || "lt-analyzer-v1";

let activeFetch = globalThis.fetch.bind(globalThis);

const modulePaths = {
  contract: path.join(SOURCE_ROOT, "lib", "llm", "learning-trace-contract.ts"),
  model: path.join(SOURCE_ROOT, "lib", "llm", "model.ts"),
  analyzer: path.join(SOURCE_ROOT, "lib", "llm", "analyze-learning-trace.ts"),
  requestValidation: path.join(SOURCE_ROOT, "lib", "validation", "json-schema.ts"),
  citationGuard: path.join(SOURCE_ROOT, "lib", "validation", "citation-guard.ts"),
  route: path.join(SOURCE_ROOT, "app", "api", "learning-trace", "route.ts"),
};

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
    throw new Error("Unable to load Learning Trace API smoke target.");
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

async function loadRoute() {
  const sources = await Promise.all(
    Object.entries(modulePaths).map(async ([name, filename]) => [
      name,
      await readFile(filename, "utf8"),
    ]),
  );
  const sourceByName = Object.fromEntries(sources);
  const modules = new Map();

  const aliases = new Map([
    ["@/lib/llm/learning-trace-contract", "contract"],
    ["@/lib/llm/model", "model"],
    ["@/lib/llm/analyze-learning-trace", "analyzer"],
    ["@/lib/validation/json-schema", "requestValidation"],
    ["@/lib/validation/citation-guard", "citationGuard"],
  ]);

  const load = (name) => {
    if (modules.has(name)) {
      return modules.get(name);
    }
    const filename = modulePaths[name];
    const source = sourceByName[name];
    if (!filename || !source) {
      throw new Error("Unsupported API smoke module.");
    }
    const exports = executeCommonJs(
      transpileTypeScript(source, filename),
      filename,
      (specifier) => {
        if (specifier === "server-only") return {};
        if (specifier === "node:fs/promises") return requireFromScript("node:fs/promises");
        if (specifier === "node:path") return requireFromScript("node:path");
        if (specifier === "next/server") return requireFromScript("next/server");
        if (specifier === "./model") return load("model");
        const alias = aliases.get(specifier);
        if (alias) return load(alias);
        throw new Error(`Unsupported API smoke dependency: ${specifier}`);
      },
    );
    modules.set(name, exports);
    return exports;
  };

  return load("route");
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
  return { sourceIds: [...sourceIds].sort(), turnIds: [...turnIds].sort() };
}

async function callRoute(route, input) {
  const request = new Request("http://localhost/api/learning-trace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const response = await route.POST(request);
  return { status: response.status, body: await response.json() };
}

function fakeInvalidSourceProviderResponse(input) {
  const invalidAnalysis = {
    dayCode: input.dayCode,
    topics: [
      {
        id: "topic-invalid-source",
        title: "Kiểm tra guardrail",
        summary: "Kết quả cố ý chứa source ID ngoài allowlist.",
        evidenceTurnIds: [input.interactions[0].turnId],
        sourceIds: ["S-NOT-ALLOWED"],
        keyConcepts: [
          {
            id: "concept-invalid-source",
            title: "Guardrail",
            summary: "Không được chấp nhận citation giả.",
            sourceIds: ["S-NOT-ALLOWED"],
          },
        ],
      },
    ],
    reviewItems: [],
    unassessableItems: [],
    relationships: [],
    meta: {
      model: "untrusted",
      promptVersion: PROMPT_VERSION,
      groundedOnly: true,
    },
  };
  return new Response(
    JSON.stringify({
      id: "resp_invalid_source",
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(invalidAnalysis) }],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function safeSummary(name, pass, responseBody, status) {
  const analysis =
    responseBody &&
    typeof responseBody === "object" &&
    Array.isArray(responseBody.topics) &&
    Array.isArray(responseBody.reviewItems) &&
    Array.isArray(responseBody.unassessableItems) &&
    Array.isArray(responseBody.relationships)
      ? responseBody
      : undefined;
  const ids = analysis ? collectSafeIds(analysis) : { sourceIds: [], turnIds: [] };
  return {
    case: name,
    pass,
    status,
    itemCount: analysis
      ? analysis.topics.length +
        analysis.reviewItems.length +
        analysis.unassessableItems.length +
        analysis.relationships.length
      : 0,
    sourceIds: ids.sourceIds,
    turnIds: ids.turnIds,
    promptVersion: analysis?.meta?.promptVersion ?? PROMPT_VERSION,
    errorCode: responseBody?.error?.code,
  };
}

function containsSensitiveText(value, apiKey) {
  const text = JSON.stringify(value).toLowerCase();
  return (
    (apiKey.length > 0 && text.includes(apiKey.toLowerCase())) ||
    text.includes("openai_api_key") ||
    text.includes("untrusted_data_start") ||
    text.includes("authority and untrusted-data boundary")
  );
}

async function runSmoke() {
  process.chdir(CODEBASE_ROOT);
  const route = await loadRoute();
  const results = [];
  const realFetch = globalThis.fetch.bind(globalThis);
  const normalInput = cloneFixture();

  try {
    activeFetch = realFetch;
    const result = await callRoute(route, normalInput);
    const ids = result.body && !result.body.error ? collectSafeIds(result.body) : null;
    const pass =
      result.status === 200 &&
      result.body.topics.length > 0 &&
      ids.sourceIds.every((id) => normalInput.sources.some((source) => source.sourceId === id)) &&
      ids.turnIds.every((id) => normalInput.interactions.some((item) => item.turnId === id));
    results.push(safeSummary("normal-input", pass, result.body, result.status));
  } catch {
    results.push(safeSummary("normal-input", false, undefined, 0));
  }

  try {
    activeFetch = realFetch;
    const result = await callRoute(route, cloneFixture({ sources: [] }));
    const ids = result.body && !result.body.error ? collectSafeIds(result.body) : null;
    const pass =
      result.status === 200 &&
      result.body.topics.length === 0 &&
      result.body.reviewItems.length === 0 &&
      result.body.relationships.length === 0 &&
      result.body.unassessableItems.length > 0 &&
      ids.sourceIds.length === 0;
    results.push(safeSummary("missing-source", pass, result.body, result.status));
  } catch {
    results.push(safeSummary("missing-source", false, undefined, 0));
  }

  try {
    activeFetch = async () => fakeInvalidSourceProviderResponse(normalInput);
    const result = await callRoute(route, normalInput);
    const pass = result.status === 502 && result.body?.error?.code === "invalid_analysis";
    results.push(safeSummary("invalid-source-response", pass, result.body, result.status));
  } catch {
    results.push(safeSummary("invalid-source-response", false, undefined, 0));
  }

  try {
    activeFetch = realFetch;
    const injectionInput = cloneFixture({
      interactions: [
        ...normalInput.interactions.map((item) => ({ ...item })),
        { ...injectionTurn },
      ],
    });
    const result = await callRoute(route, injectionInput);
    const pass =
      result.status === 200 &&
      !containsSensitiveText(result.body, process.env.OPENAI_API_KEY?.trim() ?? "");
    results.push(safeSummary("prompt-injection", pass, result.body, result.status));
  } catch {
    results.push(safeSummary("prompt-injection", false, undefined, 0));
  }

  const originalApiKey = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    activeFetch = async () => {
      throw new Error("Network must not be called without API configuration.");
    };
    const result = await callRoute(route, normalInput);
    const pass = result.status === 503 && result.body?.error?.code === "configuration";
    results.push(safeSummary("missing-api-key", pass, result.body, result.status));
  } catch {
    results.push(safeSummary("missing-api-key", false, undefined, 0));
  } finally {
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
    activeFetch = realFetch;
  }

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

await runSmoke();

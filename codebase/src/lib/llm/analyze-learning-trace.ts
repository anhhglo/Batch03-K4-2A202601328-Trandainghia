import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  LearningTraceAnalysis,
  LearningTraceInput,
} from "./learning-trace-contract";
import {
  getLearningTraceModelMetadata,
  LearningTraceModelError,
  requestStructuredLearningTrace,
  type JsonSchema,
} from "./model";

const PROMPT_ASSET_PATH = "prompts/learning-trace-system-v1.md";
const SCHEMA_ASSET_PATH = "contracts/learning-trace-output.schema.json";
const MAX_INTERACTIONS = 100;
const MAX_SOURCES = 100;
const MAX_TOTAL_INPUT_CHARACTERS = 250_000;
const RESERVED_BOUNDARIES = [
  "UNTRUSTED_DATA_START",
  "UNTRUSTED_DATA_END",
] as const;

export type LearningTraceAnalyzerErrorCode =
  | "configuration"
  | "input_validation"
  | "timeout"
  | "model_request"
  | "model_refusal"
  | "model_response"
  | "schema_validation"
  | "guardrail_validation";

export class LearningTraceAnalyzerError extends Error {
  readonly code: LearningTraceAnalyzerErrorCode;
  readonly issues: readonly string[];

  constructor(
    code: LearningTraceAnalyzerErrorCode,
    message: string,
    issues: readonly string[] = [],
  ) {
    super(message);
    this.name = "LearningTraceAnalyzerError";
    this.code = code;
    this.issues = [...issues];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: unknown,
  path: string,
  expectedKeys: readonly string[],
  issues: string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return false;
  }

  const actualKeys = Object.keys(value);
  const expected = new Set(expectedKeys);
  const missing = expectedKeys.filter((key) => !(key in value));
  const extra = actualKeys.filter((key) => !expected.has(key));

  for (const key of missing) {
    issues.push(`${path}.${key} is required.`);
  }
  for (const key of extra) {
    issues.push(`${path}.${key} is not allowed.`);
  }

  return missing.length === 0 && extra.length === 0;
}

function validateString(
  value: unknown,
  path: string,
  maxLength: number,
  issues: string[],
): value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength
  ) {
    issues.push(`${path} must be a non-empty string up to ${maxLength} characters.`);
    return false;
  }
  return true;
}

function validateArray(
  value: unknown,
  path: string,
  maxItems: number,
  issues: string[],
): value is unknown[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array.`);
    return false;
  }
  if (value.length > maxItems) {
    issues.push(`${path} must contain at most ${maxItems} items.`);
    return false;
  }
  return true;
}

function validateIdentifierArray(
  value: unknown,
  path: string,
  minItems: number,
  issues: string[],
): value is string[] {
  if (!validateArray(value, path, 5, issues)) {
    return false;
  }
  if (value.length < minItems) {
    issues.push(`${path} must contain at least ${minItems} item(s).`);
    return false;
  }

  const identifiers: string[] = [];
  for (const [index, item] of value.entries()) {
    if (validateString(item, `${path}[${index}]`, 120, issues)) {
      identifiers.push(item);
    }
  }

  if (new Set(identifiers).size !== identifiers.length) {
    issues.push(`${path} must contain unique identifiers.`);
  }

  return identifiers.length === value.length;
}

function validateKeyConcept(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (
    !hasExactKeys(
      value,
      path,
      ["id", "title", "summary", "sourceIds"],
      issues,
    )
  ) {
    return;
  }

  validateString(value.id, `${path}.id`, 120, issues);
  validateString(value.title, `${path}.title`, 120, issues);
  validateString(value.summary, `${path}.summary`, 280, issues);
  validateIdentifierArray(value.sourceIds, `${path}.sourceIds`, 1, issues);
}

function validateTopic(
  value: unknown,
  path: string,
  issues: string[],
): string | undefined {
  if (
    !hasExactKeys(
      value,
      path,
      [
        "id",
        "title",
        "summary",
        "evidenceTurnIds",
        "sourceIds",
        "keyConcepts",
      ],
      issues,
    )
  ) {
    return undefined;
  }

  const id = value.id;
  const idValid = validateString(id, `${path}.id`, 120, issues);
  validateString(value.title, `${path}.title`, 120, issues);
  validateString(value.summary, `${path}.summary`, 600, issues);
  validateIdentifierArray(
    value.evidenceTurnIds,
    `${path}.evidenceTurnIds`,
    1,
    issues,
  );
  validateIdentifierArray(value.sourceIds, `${path}.sourceIds`, 1, issues);

  if (validateArray(value.keyConcepts, `${path}.keyConcepts`, 5, issues)) {
    if (value.keyConcepts.length < 1) {
      issues.push(`${path}.keyConcepts must contain at least 1 item.`);
    }
    value.keyConcepts.forEach((item, index) =>
      validateKeyConcept(item, `${path}.keyConcepts[${index}]`, issues),
    );
  }

  return idValid ? id : undefined;
}

function validateReviewItem(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (
    !hasExactKeys(
      value,
      path,
      [
        "id",
        "title",
        "reason",
        "confidence",
        "evidenceTurnIds",
        "sourceIds",
        "relatedTopicId",
      ],
      issues,
    )
  ) {
    return;
  }

  validateString(value.id, `${path}.id`, 120, issues);
  validateString(value.title, `${path}.title`, 160, issues);
  validateString(value.reason, `${path}.reason`, 360, issues);
  if (value.confidence !== "low" && value.confidence !== "medium") {
    issues.push(`${path}.confidence must be "low" or "medium".`);
  }
  validateIdentifierArray(
    value.evidenceTurnIds,
    `${path}.evidenceTurnIds`,
    1,
    issues,
  );
  validateIdentifierArray(value.sourceIds, `${path}.sourceIds`, 1, issues);
  validateString(value.relatedTopicId, `${path}.relatedTopicId`, 120, issues);
}

function validateUnassessableItem(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (
    !hasExactKeys(
      value,
      path,
      ["id", "reasonCode", "reason", "evidenceTurnIds", "sourceIds"],
      issues,
    )
  ) {
    return;
  }

  validateString(value.id, `${path}.id`, 120, issues);
  if (
    value.reasonCode !== "ambiguous_signal" &&
    value.reasonCode !== "insufficient_source" &&
    value.reasonCode !== "missing_context" &&
    value.reasonCode !== "non_learning_interaction"
  ) {
    issues.push(`${path}.reasonCode is not supported.`);
  }
  validateString(value.reason, `${path}.reason`, 360, issues);
  validateIdentifierArray(
    value.evidenceTurnIds,
    `${path}.evidenceTurnIds`,
    1,
    issues,
  );
  validateIdentifierArray(value.sourceIds, `${path}.sourceIds`, 0, issues);
}

function validateRelationship(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (
    !hasExactKeys(
      value,
      path,
      ["fromTopicId", "toTopicId", "label", "sourceIds"],
      issues,
    )
  ) {
    return;
  }

  validateString(value.fromTopicId, `${path}.fromTopicId`, 120, issues);
  validateString(value.toTopicId, `${path}.toTopicId`, 120, issues);
  validateString(value.label, `${path}.label`, 120, issues);
  validateIdentifierArray(value.sourceIds, `${path}.sourceIds`, 1, issues);
}

function validateMeta(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (
    !hasExactKeys(
      value,
      path,
      ["model", "promptVersion", "groundedOnly"],
      issues,
    )
  ) {
    return;
  }

  validateString(value.model, `${path}.model`, 120, issues);
  validateString(value.promptVersion, `${path}.promptVersion`, 120, issues);
  if (value.groundedOnly !== true) {
    issues.push(`${path}.groundedOnly must be true.`);
  }
}

function validateOutputSchema(value: unknown): LearningTraceAnalysis {
  const issues: string[] = [];
  if (
    !hasExactKeys(
      value,
      "$",
      [
        "dayCode",
        "topics",
        "reviewItems",
        "unassessableItems",
        "relationships",
        "meta",
      ],
      issues,
    )
  ) {
    throw new LearningTraceAnalyzerError(
      "schema_validation",
      "The model output does not match the Learning Trace schema.",
      issues,
    );
  }

  validateString(value.dayCode, "$.dayCode", 600, issues);

  if (validateArray(value.topics, "$.topics", 10, issues)) {
    value.topics.forEach((item, index) =>
      validateTopic(item, `$.topics[${index}]`, issues),
    );
  }
  if (validateArray(value.reviewItems, "$.reviewItems", 5, issues)) {
    value.reviewItems.forEach((item, index) =>
      validateReviewItem(item, `$.reviewItems[${index}]`, issues),
    );
  }
  if (
    validateArray(
      value.unassessableItems,
      "$.unassessableItems",
      5,
      issues,
    )
  ) {
    value.unassessableItems.forEach((item, index) =>
      validateUnassessableItem(
        item,
        `$.unassessableItems[${index}]`,
        issues,
      ),
    );
  }
  if (validateArray(value.relationships, "$.relationships", 12, issues)) {
    value.relationships.forEach((item, index) =>
      validateRelationship(item, `$.relationships[${index}]`, issues),
    );
  }
  validateMeta(value.meta, "$.meta", issues);

  if (issues.length > 0) {
    throw new LearningTraceAnalyzerError(
      "schema_validation",
      "The model output does not match the Learning Trace schema.",
      issues,
    );
  }

  return value as unknown as LearningTraceAnalysis;
}

function validateInput(input: LearningTraceInput): void {
  const issues: string[] = [];
  validateString(input.learnerId, "input.learnerId", 120, issues);
  validateString(input.dayCode, "input.dayCode", 600, issues);
  validateString(input.conversationId, "input.conversationId", 120, issues);

  if (
    !Array.isArray(input.interactions) ||
    input.interactions.length < 1 ||
    input.interactions.length > MAX_INTERACTIONS
  ) {
    issues.push(
      `input.interactions must contain between 1 and ${MAX_INTERACTIONS} items.`,
    );
  }
  if (!Array.isArray(input.sources) || input.sources.length > MAX_SOURCES) {
    issues.push(`input.sources must contain at most ${MAX_SOURCES} items.`);
  }

  const turnIds = new Set<string>();
  let totalCharacters = 0;
  if (Array.isArray(input.interactions)) {
    input.interactions.forEach((interaction, index) => {
      const path = `input.interactions[${index}]`;
      if (validateString(interaction.turnId, `${path}.turnId`, 120, issues)) {
        if (turnIds.has(interaction.turnId)) {
          issues.push(`${path}.turnId must be unique.`);
        }
        turnIds.add(interaction.turnId);
      }
      validateString(interaction.question, `${path}.question`, 12_000, issues);
      validateString(
        interaction.tutorAnswer,
        `${path}.tutorAnswer`,
        30_000,
        issues,
      );
      if (
        interaction.page !== undefined &&
        (typeof interaction.page !== "string" ||
          interaction.page.length > 120)
      ) {
        issues.push(`${path}.page must be a string up to 120 characters.`);
      }
      totalCharacters +=
        (typeof interaction.question === "string"
          ? interaction.question.length
          : 0) +
        (typeof interaction.tutorAnswer === "string"
          ? interaction.tutorAnswer.length
          : 0) +
        (typeof interaction.page === "string" ? interaction.page.length : 0);
    });
  }

  const sourceIds = new Set<string>();
  if (Array.isArray(input.sources)) {
    input.sources.forEach((source, index) => {
      const path = `input.sources[${index}]`;
      if (validateString(source.sourceId, `${path}.sourceId`, 120, issues)) {
        if (sourceIds.has(source.sourceId)) {
          issues.push(`${path}.sourceId must be unique.`);
        }
        sourceIds.add(source.sourceId);
      }
      validateString(source.label, `${path}.label`, 240, issues);
      validateString(source.title, `${path}.title`, 240, issues);
      validateString(source.excerpt, `${path}.excerpt`, 30_000, issues);
      totalCharacters +=
        (typeof source.label === "string" ? source.label.length : 0) +
        (typeof source.title === "string" ? source.title.length : 0) +
        (typeof source.excerpt === "string" ? source.excerpt.length : 0);
    });
  }

  if (totalCharacters > MAX_TOTAL_INPUT_CHARACTERS) {
    issues.push(
      `input content exceeds ${MAX_TOTAL_INPUT_CHARACTERS} characters.`,
    );
  }

  if (issues.length > 0) {
    throw new LearningTraceAnalyzerError(
      "input_validation",
      "Learning Trace input is invalid.",
      issues,
    );
  }
}

function validateGuardrails(
  analysis: LearningTraceAnalysis,
  input: LearningTraceInput,
): void {
  const issues: string[] = [];
  const allowedTurnIds = new Set(
    input.interactions.map((interaction) => interaction.turnId),
  );
  const allowedSourceIds = new Set(
    input.sources.map((source) => source.sourceId),
  );
  const topicIds = new Set<string>();

  if (analysis.dayCode !== input.dayCode) {
    issues.push("$.dayCode must match the requested dayCode.");
  }

  analysis.topics.forEach((topic, topicIndex) => {
    if (topicIds.has(topic.id)) {
      issues.push(`$.topics[${topicIndex}].id must be unique.`);
    }
    topicIds.add(topic.id);
    checkAllowedIds(
      topic.evidenceTurnIds,
      allowedTurnIds,
      `$.topics[${topicIndex}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      topic.sourceIds,
      allowedSourceIds,
      `$.topics[${topicIndex}].sourceIds`,
      issues,
    );
    topic.keyConcepts.forEach((concept, conceptIndex) =>
      checkAllowedIds(
        concept.sourceIds,
        allowedSourceIds,
        `$.topics[${topicIndex}].keyConcepts[${conceptIndex}].sourceIds`,
        issues,
      ),
    );
  });

  analysis.reviewItems.forEach((item, index) => {
    checkAllowedIds(
      item.evidenceTurnIds,
      allowedTurnIds,
      `$.reviewItems[${index}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      item.sourceIds,
      allowedSourceIds,
      `$.reviewItems[${index}].sourceIds`,
      issues,
    );
    if (!topicIds.has(item.relatedTopicId)) {
      issues.push(
        `$.reviewItems[${index}].relatedTopicId must reference an existing topic.`,
      );
    }
  });

  analysis.unassessableItems.forEach((item, index) => {
    checkAllowedIds(
      item.evidenceTurnIds,
      allowedTurnIds,
      `$.unassessableItems[${index}].evidenceTurnIds`,
      issues,
    );
    checkAllowedIds(
      item.sourceIds,
      allowedSourceIds,
      `$.unassessableItems[${index}].sourceIds`,
      issues,
    );
  });

  analysis.relationships.forEach((relationship, index) => {
    if (!topicIds.has(relationship.fromTopicId)) {
      issues.push(
        `$.relationships[${index}].fromTopicId must reference an existing topic.`,
      );
    }
    if (!topicIds.has(relationship.toTopicId)) {
      issues.push(
        `$.relationships[${index}].toTopicId must reference an existing topic.`,
      );
    }
    if (relationship.fromTopicId === relationship.toTopicId) {
      issues.push(
        `$.relationships[${index}] must connect two different topics.`,
      );
    }
    checkAllowedIds(
      relationship.sourceIds,
      allowedSourceIds,
      `$.relationships[${index}].sourceIds`,
      issues,
    );
  });

  if (issues.length > 0) {
    throw new LearningTraceAnalyzerError(
      "guardrail_validation",
      "The model output failed Learning Trace guardrails.",
      issues,
    );
  }
}

function checkAllowedIds(
  ids: readonly string[],
  allowlist: ReadonlySet<string>,
  path: string,
  issues: string[],
): void {
  ids.forEach((id, index) => {
    if (!allowlist.has(id)) {
      issues.push(`${path}[${index}] is not in the request allowlist.`);
    }
  });
}

async function readProjectAsset(relativePath: string): Promise<string> {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), "..", relativePath),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try the next known project layout without exposing local paths.
    }
  }

  throw new LearningTraceAnalyzerError(
    "configuration",
    "Learning Trace analyzer assets are unavailable.",
  );
}

async function loadJsonSchema(): Promise<JsonSchema> {
  const rawSchema = await readProjectAsset(SCHEMA_ASSET_PATH);
  try {
    const schema: unknown = JSON.parse(rawSchema);
    if (!isRecord(schema)) {
      throw new Error("Schema is not an object.");
    }
    return schema;
  } catch {
    throw new LearningTraceAnalyzerError(
      "configuration",
      "The Learning Trace JSON Schema is invalid.",
    );
  }
}

function neutralizeReservedBoundaries(value: string): string {
  return RESERVED_BOUNDARIES.reduce(
    (result, boundary) => result.replaceAll(boundary, `[${boundary}_REMOVED]`),
    value,
  );
}

function createModelInput(
  input: LearningTraceInput,
  schema: JsonSchema,
): string {
  const metadata = getLearningTraceModelMetadata();
  const untrustedPayload = {
    interactions: input.interactions.map((interaction) => ({
      turnId: interaction.turnId,
      page: interaction.page,
      question: neutralizeReservedBoundaries(interaction.question),
      tutorAnswer: neutralizeReservedBoundaries(interaction.tutorAnswer),
    })),
    officialSourceExcerpts: input.sources.map((source) => ({
      sourceId: source.sourceId,
      label: neutralizeReservedBoundaries(source.label),
      title: neutralizeReservedBoundaries(source.title),
      excerpt: neutralizeReservedBoundaries(source.excerpt),
    })),
  };

  return [
    "TRUSTED_SCOPE",
    JSON.stringify({
      learnerId: input.learnerId,
      conversationId: input.conversationId,
      dayCode: input.dayCode,
    }),
    `ALLOWED_TURN_IDS: ${JSON.stringify(
      input.interactions.map((interaction) => interaction.turnId),
    )}`,
    `ALLOWED_SOURCE_IDS: ${JSON.stringify(
      input.sources.map((source) => source.sourceId),
    )}`,
    `OUTPUT_META: ${JSON.stringify({
      ...metadata,
      groundedOnly: true,
    })}`,
    `JSON_SCHEMA: ${JSON.stringify(schema)}`,
    "",
    "UNTRUSTED_DATA_START",
    JSON.stringify(untrustedPayload),
    "UNTRUSTED_DATA_END",
  ].join("\n");
}

function parseModelJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new LearningTraceAnalyzerError(
      "schema_validation",
      "The model output is not valid JSON.",
    );
  }
}

function translateModelError(error: LearningTraceModelError): never {
  switch (error.code) {
    case "configuration":
      throw new LearningTraceAnalyzerError("configuration", error.message);
    case "timeout":
      throw new LearningTraceAnalyzerError("timeout", error.message);
    case "refusal":
      throw new LearningTraceAnalyzerError("model_refusal", error.message);
    case "invalid_response":
      throw new LearningTraceAnalyzerError("model_response", error.message);
    case "api_request":
      throw new LearningTraceAnalyzerError(
        "model_request",
        "The Learning Trace model request failed.",
      );
  }
}

export async function analyzeLearningTrace(
  input: LearningTraceInput,
): Promise<LearningTraceAnalysis> {
  validateInput(input);

  const [systemPrompt, schema] = await Promise.all([
    readProjectAsset(PROMPT_ASSET_PATH),
    loadJsonSchema(),
  ]);

  try {
    const modelResponse = await requestStructuredLearningTrace({
      systemPrompt,
      userInput: createModelInput(input, schema),
      schema,
    });
    const analysis = validateOutputSchema(
      parseModelJson(modelResponse.jsonText),
    );
    validateGuardrails(analysis, input);

    return {
      ...analysis,
      meta: {
        model: modelResponse.model,
        promptVersion: modelResponse.promptVersion,
        groundedOnly: true,
      },
    };
  } catch (error) {
    if (error instanceof LearningTraceAnalyzerError) {
      throw error;
    }
    if (error instanceof LearningTraceModelError) {
      translateModelError(error);
    }
    throw new LearningTraceAnalyzerError(
      "model_response",
      "Learning Trace analysis failed safely.",
    );
  }
}

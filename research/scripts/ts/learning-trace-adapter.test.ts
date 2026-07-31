/**
 * Test cho tầng UI adapter — thẻ ngày và trạng thái "không đủ căn cứ".
 *
 * Chạy:
 *   node --experimental-strip-types --test research/scripts/ts/learning-trace-adapter.test.ts
 *
 * Hai hồi quy được khoá ở đây:
 *   1. Analyzer trả rỗng vẫn phải kèm lời giải thích, không được im lặng.
 *      (research/TEST-REPORT.md §6 — bộ D fail 1/8 lần, UI hiện màn trắng.)
 *   2. Phân tích ngày mới không được xoá các ngày đã có trên lưới thẻ.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compareDays,
  mapAnalysisToDay,
  upsertAnalyzedDay,
} from "../../../codebase/src/lib/ui/learning-trace-adapter.ts";
import type { LearningTraceAnalysis } from "../../../codebase/src/lib/llm/learning-trace-contract.ts";
import type {
  LearningDay,
  SourceReference,
} from "../../../codebase/src/types/learning-trace.ts";

const sources: SourceReference[] = [
  {
    id: "T01-074",
    label: "Transcript Day02 · T01-074",
    title: "Ma trận tác động – nỗ lực",
    excerpt: "Đánh giá tác động và công sức để khoanh vùng việc đáng ưu tiên.",
  },
];

function shell(dayCode: string, number: string) {
  return {
    id: dayCode,
    number,
    label: `Day ${number}`,
    title: "Learning Trace thử nghiệm",
    statusLabel: "Sẵn sàng tổng hợp",
    slideCount: 29,
  };
}

function analysis(
  overrides: Partial<LearningTraceAnalysis> = {},
): LearningTraceAnalysis {
  return {
    dayCode: "day02-c301",
    topics: [],
    reviewItems: [],
    relationships: [],
    unassessableItems: [],
    meta: {
      model: "gpt-5-nano",
      promptVersion: "lt-analyzer-v1",
      groundedOnly: true,
    },
    ...overrides,
  } as LearningTraceAnalysis;
}

function dayFrom(
  value: LearningTraceAnalysis,
  dayCode = "day02-c301",
  number = "02",
): LearningDay {
  return mapAnalysisToDay(value, {
    shell: shell(dayCode, number),
    sources,
    interactionCount: 3,
  });
}

test("phân tích rỗng hoàn toàn vẫn nêu lý do, không im lặng", () => {
  const day = dayFrom(analysis());

  assert.equal(day.topics.length, 0);
  assert.equal(day.reviewItems.length, 0);
  assert.notEqual(
    day.unassessableNote,
    "Không có tương tác nào bị loại khỏi gợi ý ôn tập.",
    "kết quả rỗng không được dùng câu dành cho phiên có kết luận",
  );
  assert.match(day.unassessableNote, /chưa đủ căn cứ|Hãy mở lại lượt chat gốc/i);
});

test("phân tích rỗng nhưng có unassessableItems thì hiển thị đúng lý do model trả về", () => {
  const day = dayFrom(
    analysis({
      unassessableItems: [
        {
          id: "U1",
          reason: "Câu hỏi về lịch học, không thuộc nội dung học tập.",
          reasonCode: "non_learning_interaction",
          evidenceTurnIds: [],
          sourceIds: [],
        },
      ] as LearningTraceAnalysis["unassessableItems"],
    }),
  );

  assert.equal(
    day.unassessableNote,
    "Câu hỏi về lịch học, không thuộc nội dung học tập.",
  );
});

test("phiên có chủ đề vẫn giữ câu mặc định cũ", () => {
  const day = dayFrom(
    analysis({
      topics: [
        {
          id: "TP1",
          title: "Ma trận tác động – nỗ lực",
          summary: "Ưu tiên theo tác động và công sức.",
          keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-1"],
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
    }),
  );

  assert.equal(day.topics.length, 1);
  assert.equal(
    day.unassessableNote,
    "Không có tương tác nào bị loại khỏi gợi ý ôn tập.",
  );
});

test("thêm ngày mới không xoá ngày đã có trên lưới thẻ", () => {
  const day02 = dayFrom(analysis(), "day02-c301", "02");
  const day01 = dayFrom(
    analysis({ dayCode: "day01-foundation" }),
    "day01-foundation",
    "01",
  );

  const afterFirst = upsertAnalyzedDay([], day02);
  const afterSecond = upsertAnalyzedDay(afterFirst, day01);

  assert.deepEqual(
    afterSecond.map((day) => day.id),
    ["day01-foundation", "day02-c301"],
    "hai ngày cùng tồn tại và sắp theo số ngày tăng dần",
  );
});

test("phân tích lại một ngày thì thay thế đúng thẻ đó, không tạo thẻ trùng", () => {
  const first = dayFrom(analysis(), "day02-c301", "02");
  const second = mapAnalysisToDay(
    analysis({
      topics: [
        {
          id: "TP1",
          title: "Chủ đề mới",
          summary: "Tóm tắt mới.",
          keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-9"],
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
    }),
    { shell: shell("day02-c301", "02"), sources, interactionCount: 5 },
  );

  const days = upsertAnalyzedDay(upsertAnalyzedDay([], first), second);

  assert.equal(days.length, 1);
  assert.equal(days[0].topics.length, 1);
  assert.equal(days[0].interactionCount, 5);
});

test("compareDays xếp Day 01 trước Day 02", () => {
  const day01 = dayFrom(analysis(), "day01-foundation", "01");
  const day02 = dayFrom(analysis(), "day02-c301", "02");

  assert.ok(compareDays(day01, day02) < 0);
  assert.ok(compareDays(day02, day01) > 0);
});

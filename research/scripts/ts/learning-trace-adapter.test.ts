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
  condenseToNodeText,
  MINDMAP_NODE_MAX_CHARS,
  splitIntoNodeText,
  stripParentContext,
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

test("key concept của topic được giữ lại cho mindmap, không bị bỏ", () => {
  const day = dayFrom(
    analysis({
      topics: [
        {
          id: "TP1",
          title: "Ma trận tác động – nỗ lực",
          summary: "Ưu tiên theo tác động và công sức.",
          keyConcepts: [
            {
              id: "KC1",
              title: "Tác động",
              summary: "Lợi ích đạt được nếu giải quyết vấn đề.",
              sourceIds: ["T01-074"],
            },
            {
              id: "KC2",
              title: "Nỗ lực",
              summary: "Công sức phải bỏ ra để làm việc đó.",
              sourceIds: ["T01-074"],
            },
          ],
          evidenceTurnIds: ["T-TUTOR-1"],
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
    }),
  );

  assert.equal(day.topics[0].keyConcepts?.length, 2);
  assert.deepEqual(
    day.topics[0].keyConcepts?.map((concept) => concept.title),
    ["Tác động", "Nỗ lực"],
  );
  assert.equal(
    day.topics[0].keyConcepts?.[0].summary,
    "Lợi ích đạt được nếu giải quyết vấn đề.",
    "mindmap cần cả nội dung tóm tắt, không chỉ tiêu đề",
  );
  assert.equal(
    day.topics[0].summary,
    "Ưu tiên theo tác động và công sức.",
    "tóm tắt của chính chủ đề cũng phải tới được mindmap",
  );
});

test("topic không có key concept vẫn map được, mindmap chỉ bớt lá", () => {
  const day = dayFrom(
    analysis({
      topics: [
        {
          id: "TP1",
          title: "Chủ đề trống",
          summary: "Tóm tắt.",
          keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-1"],
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
    }),
  );

  assert.deepEqual(day.topics[0].keyConcepts, []);
});

test("node mindmap không được dài quá giới hạn, phần dài vỡ thành node con", () => {
  // Đúng đoạn tóm tắt đang tràn trong ảnh chụp màn hình: 1 node, 158 ký tự.
  const summary =
    "Phân kỳ là mở rộng không gian khám phá để có nhiều ứng viên và thông tin; " +
    "hội tụ là quy nạp, tìm điểm chung và sắp xếp ưu tiên trước khi lựa chọn " +
    "vấn đề hoặc giải pháp.";

  const nodes = splitIntoNodeText(summary);

  assert.ok(nodes.length > 1, "phải tách ra nhiều node, không dồn vào một node");
  for (const node of nodes) {
    assert.ok(
      node.length <= MINDMAP_NODE_MAX_CHARS,
      `node "${node}" dài ${node.length} ký tự, vượt ${MINDMAP_NODE_MAX_CHARS}`,
    );
  }
});

test("tách theo mệnh đề, không cắt giữa từ", () => {
  const nodes = splitIntoNodeText(
    "Phân kỳ là mở rộng không gian khám phá; hội tụ là quy nạp lại.",
  );

  assert.deepEqual(nodes, [
    "Phân kỳ là mở rộng không gian khám phá",
    "hội tụ là quy nạp lại",
  ]);
});

test("chuỗi ngắn giữ nguyên một node", () => {
  assert.deepEqual(splitIntoNodeText("Token là đơn vị tính"), [
    "Token là đơn vị tính",
  ]);
});

test("không mất chữ khi tách: mọi từ đều còn lại", () => {
  const summary =
    "Sau khi gom các vấn đề, đánh giá tác động đạt được nếu giải quyết và " +
    "công sức cần bỏ ra để khoanh vùng việc đáng ưu tiên, tránh làm việc tốn " +
    "nguồn lực lớn nhưng lợi ích thấp.";

  // Bỏ dấu câu ở cả hai vế: khi hai mệnh đề được gộp chung một node, dấu phẩy
  // nối chúng lại được giữ nguyên bên trong node đó.
  const toWords = (value: string) =>
    value.replace(/[.,;]/g, "").split(/\s+/).filter(Boolean);

  assert.deepEqual(
    toWords(splitIntoNodeText(summary).join(" ")),
    toWords(summary),
    "tách node không được làm rơi chữ nào",
  );
});

test("chuỗi rỗng hoặc chỉ khoảng trắng không sinh node", () => {
  assert.deepEqual(splitIntoNodeText(""), []);
  assert.deepEqual(splitIntoNodeText("   "), []);
});

test("một từ dài hơn giới hạn vẫn được giữ, không cắt vụn", () => {
  const long = "Supercalifragilisticexpialidociousandthensomemoretext";
  assert.deepEqual(splitIntoNodeText(long), [long]);
});

test("node con bỏ phần ngữ cảnh đã có ở node cha", () => {
  const parent = "Phân kỳ và hội tụ trong Design Thinking";

  assert.equal(
    stripParentContext("Phân kỳ (Diversification) trong Design Thinking", parent),
    "Phân kỳ (Diversification)",
  );
  assert.equal(
    stripParentContext("Hội tụ (Convergence) trong Design Thinking", parent),
    "Hội tụ (Convergence)",
  );
});

test("không cắt khi node con không lặp lại node cha", () => {
  assert.equal(
    stripParentContext("Token là đơn vị tính", "Attention và multi-head"),
    "Token là đơn vị tính",
  );
});

test("không cắt trụi node con xuống còn một từ", () => {
  assert.equal(
    stripParentContext("Attention là gì", "Cơ chế attention là gì"),
    "Attention là gì",
  );
});

test("tiêu đề key concept sau khi rút gọn phải lọt giới hạn node", () => {
  const parent = "Phân kỳ và hội tụ trong Design Thinking";
  for (const raw of [
    "Phân kỳ (Diversification) trong Design Thinking",
    "Hội tụ (Convergence) trong Design Thinking",
  ]) {
    const label = splitIntoNodeText(stripParentContext(raw, parent))[0];
    assert.ok(
      label.length <= MINDMAP_NODE_MAX_CHARS,
      `"${label}" dài ${label.length} ký tự (gốc ${raw.length})`,
    );
  }
});

test("không cắt đôi từ ghép tiếng Việt giữa hai node", () => {
  // Chính các chuỗi đã vỡ trong ảnh chụp: "xử lý" bị tách thành "xử" và "lý",
  // "khác nhau" bị tách thành "khác" và "nhau". Tiếng Việt viết rời từng âm
  // tiết nên ngắt theo khoảng trắng là cắt giữa từ.
  const cases: Array<[string, string[]]> = [
    [
      "Token là một đơn vị tính để mô hình xử lý, không phải từ nguyên văn",
      ["xử lý", "đơn vị", "nguyên văn"],
    ],
    [
      'Multi-head attention cho phép mô hình có nhiều "con mắt" nhìn ở các vị trí khác nhau để nhận ra quy luật và đặc trưng khác nhau',
      ["khác nhau", "quy luật", "đặc trưng"],
    ],
    [
      "Quản lý sự chú ý và ngữ cảnh là chìa khóa để mô hình hoạt động hiệu quả và tiết kiệm chi phí",
      ["chú ý", "ngữ cảnh", "chìa khóa", "hiệu quả", "chi phí"],
    ],
  ];

  for (const [text, compounds] of cases) {
    const nodes = splitIntoNodeText(text);
    for (const compound of compounds) {
      const inOriginal = text.split(compound).length - 1;
      const inNodes = nodes.reduce(
        (total, node) => total + (node.split(compound).length - 1),
        0,
      );
      assert.equal(
        inNodes,
        inOriginal,
        `"${compound}" bị cắt đôi giữa các node: ${JSON.stringify(nodes)}`,
      );
    }
  }
});

test("gộp lại các mảnh vụn thay vì để node một, hai chữ", () => {
  const nodes = splitIntoNodeText(
    "Token là một đơn vị tính để mô hình xử lý, không phải từ nguyên văn",
  );

  for (const node of nodes) {
    assert.ok(
      node.split(/\s+/).length >= 3,
      `node "${node}" quá vụn, chỉ có ${node.split(/\s+/).length} âm tiết`,
    );
  }
});

test("mệnh đề không có ranh giới nào thì giữ nguyên, không cắt bừa", () => {
  const clause = "Multi-head attention cho phép mô hình xem nhiều vị trí";
  assert.deepEqual(splitIntoNodeText(clause), [clause]);
});

test("không có quan hệ có căn cứ thì không sinh nhãn placeholder", () => {
  const day = dayFrom(
    analysis({
      topics: [
        {
          id: "TP1",
          title: "Attention",
          summary: "Tóm tắt.",
          keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-1"],
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
      relationships: [],
    }),
  );

  assert.equal(
    day.topics[0].mindmapChild,
    "",
    'không được trả "Chưa có liên kết có căn cứ" để mindmap vẽ thành node',
  );
});

test("có quan hệ có căn cứ thì vẫn giữ nhãn thật", () => {
  const day = dayFrom(
    analysis({
      topics: [
        {
          id: "TP1", title: "A", summary: "s", keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-1"], sourceIds: ["T01-074"],
        },
        {
          id: "TP2", title: "B", summary: "s", keyConcepts: [],
          evidenceTurnIds: ["T-TUTOR-1"], sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["topics"],
      relationships: [
        {
          fromTopicId: "TP1",
          toTopicId: "TP2",
          label: "A dẫn tới B",
          sourceIds: ["T01-074"],
        },
      ] as LearningTraceAnalysis["relationships"],
    }),
  );

  assert.equal(day.topics[0].mindmapChild, "A dẫn tới B");
});

test("condenseToNodeText rút về đúng một dòng lọt giới hạn node", () => {
  const summary =
    "Context window là phạm vi thông tin mô hình có thể tiêu thụ trong một " +
    "lượt xử lý, tăng context không phải lúc nào cũng tốt, cần quản lý ngữ " +
    "cảnh hiệu quả.";

  const line = condenseToNodeText(summary);

  assert.ok(line.length > 0, "phải giữ lại nội dung, không trả rỗng");
  assert.ok(
    line.length <= MINDMAP_NODE_MAX_CHARS,
    `dòng dài ${line.length} ký tự, vượt ${MINDMAP_NODE_MAX_CHARS}`,
  );
  assert.ok(
    summary.startsWith(line.slice(0, 20)),
    "phải là mệnh đề mở đầu, không phải đoạn cắt ở giữa",
  );
});

test("condenseToNodeText giữ nguyên chuỗi vốn đã ngắn", () => {
  assert.equal(
    condenseToNodeText("Token là đơn vị tính"),
    "Token là đơn vị tính",
  );
});

test("chuỗi rỗng thì condense trả rỗng, không trả undefined", () => {
  assert.equal(condenseToNodeText(""), "");
  assert.equal(condenseToNodeText("   "), "");
});

test("giới hạn node là 50 ký tự", () => {
  assert.equal(MINDMAP_NODE_MAX_CHARS, 50);
});

test("compareDays xếp Day 01 trước Day 02", () => {
  const day01 = dayFrom(analysis(), "day01-foundation", "01");
  const day02 = dayFrom(analysis(), "day02-c301", "02");

  assert.ok(compareDays(day01, day02) < 0);
  assert.ok(compareDays(day02, day01) > 0);
});

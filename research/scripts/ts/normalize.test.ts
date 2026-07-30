/**
 * Test cho ba module Data & Evidence trong codebase/src.
 *
 * Chạy:
 *   node --experimental-strip-types --test research/scripts/ts/normalize.test.ts
 *   (hoặc: bash research/scripts/run-tests.sh — chạy cả bộ Python lẫn TS)
 *
 * Vì sao test nằm ở research/ chứ không nằm cạnh module:
 *   Node cần đuôi ".ts" trong import specifier, còn tsconfig của codebase chưa bật
 *   allowImportingTsExtensions — để test trong codebase/src sẽ làm `npm run build`
 *   của cả nhóm đỏ. tsconfig chỉ include từ thư mục codebase/, nên đặt test ở đây
 *   là tránh được xung đột mà không phải sửa file dùng chung.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  resolveSources,
  verifyCitation,
  listKnownDayCodes,
} from "../../../codebase/src/lib/grounding/source-manifest.ts";
import {
  stripSelection,
  extractStudentText,
  normalizeInteractions,
  type RawTutorRow,
} from "../../../codebase/src/lib/trace/normalize.ts";
import {
  fixtures,
  day02HappyRows,
  thinSessionRows,
  unmappableSourceRows,
} from "../../../codebase/src/data/learning-trace-fixtures.ts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

// ---------------------------------------------------------------------------
// source-manifest
// ---------------------------------------------------------------------------

test("manifest: day_code gọi tên Day 1/Day 2 thì map được", () => {
  for (const code of ["day02-c301", "Day1-C302", "Day 1", "Day 2", "Day1-D302"]) {
    const r = resolveSources(code);
    assert.equal(r.status, "mapped", `${code} phải map được`);
  }
});

test("manifest: nhận đúng số buổi từ nhiều cách viết day_code", () => {
  assert.equal(resolveSources("Day1-C401").status === "mapped" && resolveSources("Day1-C401").day, 1);
  assert.equal(resolveSources("day02-c301").status === "mapped" && resolveSources("day02-c301").day, 2);
  assert.equal(resolveSources("Day 2").status === "mapped" && resolveSources("Day 2").day, 2);
});

test("manifest: placeholder day_code trả lý do riêng, không lẫn với mã lạ", () => {
  const r = resolveSources("New learning material");
  assert.equal(r.status, "unmappable");
  assert.equal(r.status === "unmappable" && r.reason, "placeholder-day-code");
});

test("manifest: mã đã biết nhưng tài liệu không có trong pack", () => {
  const r = resolveSources("Lecture_material_ms2044ey_k6uor3");
  assert.equal(r.status === "unmappable" && r.reason, "document-not-in-pack");
});

test("manifest: mã hoàn toàn lạ được phân biệt với mã đã biết", () => {
  const r = resolveSources("khong-ton-tai-xyz");
  assert.equal(r.status === "unmappable" && r.reason, "unknown-day-code");
});

test("manifest: KHÔNG BAO GIỜ trả mapped kèm danh sách tài liệu rỗng", () => {
  for (const code of listKnownDayCodes()) {
    const r = resolveSources(code);
    if (r.status === "mapped") {
      assert.ok(r.documents.length > 0, `${code} map nhưng không có tài liệu`);
    }
  }
});

test("manifest: mọi day_code có thật trong chatlog đều resolve được, không ném lỗi", () => {
  for (const code of listKnownDayCodes()) {
    assert.doesNotThrow(() => resolveSources(code));
  }
});

test("manifest: mọi nhánh unmappable đều có hint đọc được cho học viên", () => {
  for (const code of listKnownDayCodes()) {
    const r = resolveSources(code);
    if (r.status === "unmappable") {
      assert.ok(r.hint.length > 30, `${code}: hint quá sơ sài`);
    }
  }
});

test("citation: trang trong 29 trang của pack thì kiểm chứng được", () => {
  const c = verifyCitation("day02-c301", 17);
  assert.equal(c.verifiable, true);
});

test("citation: trang vượt bản rút gọn thì KHÔNG kiểm chứng được", () => {
  // Tutor production trích tới trang 96; pack chỉ có 29 trang.
  const c = verifyCitation("day02-c301", 62);
  assert.equal(c.verifiable, false);
  assert.match(c.verifiable === false ? c.reason : "", /vượt quá 29 trang/);
});

test("citation: buổi không map được thì luôn không kiểm chứng được", () => {
  assert.equal(verifyCitation("New learning material", 1).verifiable, false);
});

test("citation: số trang không hợp lệ bị chặn", () => {
  assert.equal(verifyCitation("day02-c301", 0).verifiable, false);
  assert.equal(verifyCitation("day02-c301", -3).verifiable, false);
  assert.equal(verifyCitation("day02-c301", 1.5).verifiable, false);
});

// ---------------------------------------------------------------------------
// stripSelection / extractStudentText
// ---------------------------------------------------------------------------

test("stripSelection: tách đúng số trang và đoạn được chọn", () => {
  const r = stripSelection('(Trang 17, đoạn được chọn: "Perception") Giải thích đi');
  assert.equal(r.page, 17);
  assert.equal(r.selection, "Perception");
  assert.equal(r.question, "Giải thích đi");
});

test("stripSelection: không có tiền tố thì giữ nguyên câu hỏi", () => {
  const r = stripSelection("tóm tắt slide này");
  assert.deepEqual(r, { question: "tóm tắt slide này", selection: "" });
});

test("stripSelection: đoạn chọn nhiều dòng vẫn tách được", () => {
  const r = stripSelection('(Trang 3, đoạn được chọn: "dòng 1\ndòng 2") hỏi gì đó');
  assert.equal(r.page, 3);
  assert.equal(r.question, "hỏi gì đó");
});

test("extractStudentText: câu template thuần trả về rỗng", () => {
  assert.equal(extractStudentText('Giải thích đoạn bôi đen ở Trang 41: "Othello-GPT"'), "");
  assert.equal(extractStudentText("Giải thích đoạn bôi đen ở Trang 17."), "");
});

test("extractStudentText: giữ nguyên chữ học viên tự gõ", () => {
  assert.equal(extractStudentText("tôi chưa hiểu tại sao"), "tôi chưa hiểu tại sao");
});

test("extractStudentText: chặn khớp nhầm vào chữ trên slide", () => {
  // Chính lỗi đã bắt được khi mining: cụm "đăng ký môn học" nằm trong đề bài
  // trên slide, không phải học viên hỏi về đăng ký môn.
  const pasted =
    'Giải thích đoạn bôi đen ở Trang 17: "viết prompt cho chatbot đăng ký môn học"';
  assert.ok(!extractStudentText(pasted).includes("đăng ký"));
});

test("extractStudentText: chuẩn hoá khoảng trắng", () => {
  assert.equal(extractStudentText("  nhiều   khoảng \n trắng  "), "nhiều khoảng trắng");
});

// ---------------------------------------------------------------------------
// normalizeInteractions
// ---------------------------------------------------------------------------

const DAY02 = resolveSources("day02-c301");

test("normalize: chỉ giữ dữ liệu của học viên đang xem", () => {
  const rows: RawTutorRow[] = [
    ...day02HappyRows,
    {
      turnId: "T9999",
      userId: "U0999",
      conversationId: "C0302",
      dayCode: "day02-c301",
      studentContent: "câu hỏi của người khác",
      tutorContent: "trả lời",
      citations: [],
    },
  ];
  const out = normalizeInteractions(rows, { learnerId: "U0323", dayCode: "day02-c301" }, DAY02);
  assert.equal(out.interactions.length, 4);
  assert.ok(!out.interactions.some((i) => i.turnId === "T9999"));
});

test("normalize: lọc đúng theo day_code, không trộn buổi", () => {
  const rows: RawTutorRow[] = [...day02HappyRows, ...unmappableSourceRows];
  const out = normalizeInteractions(rows, { learnerId: "U0323", dayCode: "day02-c301" }, DAY02);
  assert.ok(out.interactions.every((i) => i.turnId.startsWith("T")));
  assert.equal(out.interactions.length, 4);
});

test("normalize: lọc theo conversationId khi được truyền", () => {
  const out = normalizeInteractions(
    day02HappyRows,
    { learnerId: "U0323", dayCode: "day02-c301", conversationId: "C9999" },
    DAY02,
  );
  assert.equal(out.interactions.length, 0);
});

test("normalize: phát hiện lượt hỏi lại cùng trang trong phiên", () => {
  const out = normalizeInteractions(day02HappyRows, { learnerId: "U0323", dayCode: "day02-c301" }, DAY02);
  const t0611 = out.interactions.find((i) => i.turnId === "T0611");
  const t0223 = out.interactions.find((i) => i.turnId === "T0223");
  // Cả hai cùng hỏi về Trang 16 → cờ hỏi lại phải bật cho cả hai.
  assert.equal(t0611?.flags.repeatsPageInSession, true);
  assert.equal(t0223?.flags.repeatsPageInSession, true);
});

test("normalize: lượt hỏi trang chỉ xuất hiện một lần thì không bật cờ hỏi lại", () => {
  const out = normalizeInteractions(thinSessionRows, { learnerId: "U0211", dayCode: "day02-c301" }, DAY02);
  assert.equal(out.interactions[0].flags.repeatsPageInSession, false);
});

test("normalize: gắn cờ đúng cho câu hỏi template không có chữ học viên", () => {
  const rows: RawTutorRow[] = [
    {
      turnId: "T0001",
      userId: "U0001",
      conversationId: "C0001",
      dayCode: "day02-c301",
      studentContent:
        '(Trang 17, đoạn được chọn: "Affinity Mapping") Giải thích đoạn bôi đen ở Trang 17: "Affinity Mapping"',
      tutorContent: "…",
      citations: [17],
    },
  ];
  const out = normalizeInteractions(rows, { learnerId: "U0001", dayCode: "day02-c301" }, DAY02);
  assert.equal(out.interactions[0].flags.isTemplateQuestion, true);
  assert.equal(out.interactions[0].flags.hasNoStudentWords, true);
  assert.equal(out.interactions[0].studentText, "");
});

test("normalize: không đột biến mảng citations của input", () => {
  const original = [16];
  const rows: RawTutorRow[] = [
    {
      turnId: "T0002",
      userId: "U0001",
      conversationId: "C0001",
      dayCode: "day02-c301",
      studentContent: "hỏi gì đó",
      tutorContent: "…",
      citations: original,
    },
  ];
  const out = normalizeInteractions(rows, { learnerId: "U0001", dayCode: "day02-c301" }, DAY02);
  out.interactions[0].citations.push(99);
  assert.deepEqual(original, [16], "normalizer đã sửa mảng của caller");
});

test("normalize: mang theo kết quả ánh xạ nguồn", () => {
  const out = normalizeInteractions(day02HappyRows, { learnerId: "U0323", dayCode: "day02-c301" }, DAY02);
  assert.equal(out.sourceResolution.status, "mapped");
});

test("normalize: danh sách rỗng không làm vỡ hàm", () => {
  const out = normalizeInteractions([], { learnerId: "U0000", dayCode: "Day 1" }, resolveSources("Day 1"));
  assert.equal(out.interactions.length, 0);
  assert.equal(out.conversationId, "");
});

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

test("fixture: cả ba fixture đều dùng mã ẩn danh đúng định dạng", () => {
  for (const rows of Object.values(fixtures)) {
    for (const row of rows) {
      assert.match(row.turnId, /^T\d{4}$/);
      assert.match(row.userId, /^U\d{4}$/);
      assert.match(row.conversationId, /^C\d{4}$/);
    }
  }
});

test("fixture: mỗi fixture chỉ chứa dữ liệu của đúng một học viên", () => {
  for (const [name, rows] of Object.entries(fixtures)) {
    const learners = new Set(rows.map((r) => r.userId));
    assert.equal(learners.size, 1, `${name} lẫn dữ liệu nhiều học viên`);
  }
});

test("fixture happy: sinh ra được possible_gap có bằng chứng", () => {
  const out = normalizeInteractions(day02HappyRows, { learnerId: "U0323", dayCode: "day02-c301" }, DAY02);
  const repeated = out.interactions.filter((i) => i.flags.repeatsPageInSession);
  assert.ok(repeated.length >= 2, "fixture happy phải có signal hỏi lại");
  // và citation của nó phải kiểm chứng được, nếu không thì demo happy path rỗng.
  for (const i of repeated) {
    for (const page of i.citations) {
      assert.equal(verifyCitation("day02-c301", page).verifiable, true);
    }
  }
});

test("fixture thin: đúng một lượt, phản ánh 51,9% phiên thật", () => {
  assert.equal(thinSessionRows.length, 1);
});

test("fixture unmappable: không nguồn nào kiểm chứng được", () => {
  const resolution = resolveSources("New learning material");
  assert.equal(resolution.status, "unmappable");
  for (const row of unmappableSourceRows) {
    for (const page of row.citations) {
      assert.equal(verifyCitation(row.dayCode, page).verifiable, false);
    }
  }
});

test("fixture: câu trả lời Tutor được cắt ngắn theo quy định data pack", () => {
  for (const rows of Object.values(fixtures)) {
    for (const row of rows) {
      assert.ok(
        row.tutorContent.length <= 250,
        `${row.turnId}: trích ${row.tutorContent.length} ký tự, vượt mức trích ngắn`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Đối chiếu chéo với bản Python trên toàn bộ chatlog
// ---------------------------------------------------------------------------

test("conformance: bóc text ra kết quả y hệt bản Python trên 1.261 lượt", () => {
  const path = resolve(REPO, "research/samples/normalizer-conformance.json");
  if (!existsSync(path)) {
    // samples/ nằm ngoài git; sinh lại bằng:
    //   python3 research/scripts/mine_chatlog.py --samples
    console.log("      (bỏ qua: chưa sinh normalizer-conformance.json)");
    return;
  }

  const cases: Array<{
    turnId: string;
    studentContent: string;
    expectedQuestion: string;
    expectedStudentText: string;
    expectedPage: number | null;
  }> = JSON.parse(readFileSync(path, "utf-8"));

  assert.ok(cases.length > 1000, `chỉ có ${cases.length} lượt, dữ liệu không đầy đủ`);

  const mismatches: string[] = [];
  for (const c of cases) {
    const { question, page } = stripSelection(c.studentContent);
    const studentText = extractStudentText(question);
    if (question !== c.expectedQuestion) {
      mismatches.push(`${c.turnId} question: TS="${question.slice(0, 40)}" PY="${c.expectedQuestion.slice(0, 40)}"`);
    }
    if (studentText !== c.expectedStudentText) {
      mismatches.push(`${c.turnId} studentText: TS="${studentText.slice(0, 40)}" PY="${c.expectedStudentText.slice(0, 40)}"`);
    }
    if ((page ?? null) !== c.expectedPage) {
      mismatches.push(`${c.turnId} page: TS=${page} PY=${c.expectedPage}`);
    }
  }

  assert.deepEqual(
    mismatches.slice(0, 5),
    [],
    `${mismatches.length}/${cases.length * 3} phép so lệch giữa TS và Python`,
  );
});

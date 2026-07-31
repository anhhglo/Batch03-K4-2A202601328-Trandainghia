#!/usr/bin/env node
/**
 * Giả lập AI Tutor bằng model local (Ollama) để sinh log MỚI, rồi đẩy qua
 * Learning Trace và kiểm các bất biến.
 *
 * Vì sao cần thêm tầng này khi đã có `e2e-data-test.mjs`:
 *
 *   6 bộ trong `data-test.md` là dữ liệu viết tay — hệ thống và prompt đã được
 *   ngắm vào chúng. Chúng chứng minh sản phẩm chạy đúng trên input đã biết.
 *   Chúng KHÔNG chứng minh sản phẩm giữ được lời hứa trên input chưa từng thấy.
 *
 *   File này sinh log bằng một model KHÁC (qwen2.5:14b chạy local), với nội dung
 *   model chưa từng thấy, rồi kiểm đúng sáu bất biến đó. Nếu bất biến vỡ ở đây
 *   mà không vỡ ở bộ viết tay, nghĩa là hệ thống đang khớp với case chứ không
 *   thật sự tuân thủ nguyên tắc.
 *
 * Phân bố phiên bám ĐÚNG dữ liệu thật (research/mining-log.md):
 *   - 51,9% phiên chỉ có 1 lượt · 74,4% có ≤2 lượt
 *   - 28,3% câu hỏi là template do platform sinh, học viên không gõ chữ nào
 *   - 10,6% lượt là yêu cầu tóm tắt
 *   - 0,6% lượt học viên nói rõ chưa hiểu
 *   - 46,2% câu trả lời Tutor không có căn cứ
 *
 * Sinh ngẫu nhiên theo phân bố tùy tiện sẽ tạo ra dữ liệu không giống thực tế
 * và bài kiểm mất giá trị.
 *
 * Chạy:
 *   cd codebase && npm run dev                                   # cửa sổ 1
 *   node research/scripts/simulate-tutor.mjs [số phiên]          # cửa sổ 2
 *
 * Không in API key, không in system prompt, không in nguyên văn phản hồi model.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

import { checkInvariants, callApi } from "./lib/lt-assertions.mjs";

const ENDPOINT = process.env.LT_ENDPOINT ?? "http://localhost:3000/api/learning-trace";
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TUTOR_MODEL = process.env.TUTOR_SIM_MODEL ?? "qwen2.5:14b";
const SESSIONS = Number(process.argv[2] ?? 5);
const SEED = Number(process.env.SIM_SEED ?? 20260731);

/** PRNG có seed — chạy lại cùng seed ra cùng bộ dữ liệu. */
let seedState = SEED >>> 0;
function rand() {
  // Math.imul giữ phép nhân trong 32-bit; nhân trực tiếp sẽ vượt
  // Number.MAX_SAFE_INTEGER và mất bit thấp, làm chuỗi số mất tính lặp lại.
  seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
  return seedState / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/** Chủ đề + nguồn để model bám vào. Nguồn là thứ DUY NHẤT được phép trích dẫn. */
const TOPIC_POOL = [
  {
    key: "retrieval",
    topic: "Retrieval-Augmented Generation",
    sourceTitle: "RAG nối mô hình với nguồn ngoài",
    excerpt:
      "RAG lấy các đoạn tài liệu liên quan rồi đưa vào ngữ cảnh trước khi mô hình sinh câu trả lời. Nhờ vậy câu trả lời bám vào tài liệu được cấp thay vì chỉ dựa trên tham số đã học.",
  },
  {
    key: "eval",
    topic: "Đánh giá sản phẩm AI",
    sourceTitle: "Golden set và quality bar",
    excerpt:
      "Golden set là tập case cố định dùng để đo chất lượng qua từng lần sửa. Quality bar là ngưỡng cam kết trước khi đo, giữ nguyên để kết quả các lượt so sánh được với nhau.",
  },
  {
    key: "automation",
    topic: "Mức tự động hoá",
    sourceTitle: "Augment, conditional và automate",
    excerpt:
      "Chọn mức tự động hoá theo chi phí khi sai. Sai đắt thì để người quyết; đa số case lành và số ít hiểm thì tự làm phần chắc và chuyển người phần mơ hồ.",
  },
  {
    key: "guardrail",
    topic: "Guardrail cho đầu ra mô hình",
    sourceTitle: "Chặn nội dung không có căn cứ",
    excerpt:
      "Guardrail kiểm tra đầu ra trước khi hiển thị: mọi trích dẫn phải nằm trong danh sách nguồn được cấp, và nội dung không có nguồn thì bị loại thay vì hiển thị kèm phỏng đoán.",
  },
];

async function ollama(prompt, { temperature = 0.9, maxTokens = 260 } = {}) {
  const response = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TUTOR_MODEL,
      prompt,
      stream: false,
      format: "json",
      options: { temperature, num_predict: maxTokens, seed: Math.floor(rand() * 1e9) },
    }),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = await response.json();
  try {
    return JSON.parse(data.response);
  } catch {
    return null;
  }
}

/** Bốn dạng câu hỏi, tỉ lệ bám phân bố thật đã đo trên 1.261 lượt. */
function drawQuestionKind() {
  const r = rand();
  if (r < 0.283) return "template";
  if (r < 0.389) return "summary";
  if (r < 0.395) return "confusion";
  return "normal";
}

/** Số lượt mỗi phiên, bám phân bố thật: 51,9% một lượt, 74,4% ≤ hai lượt. */
function drawTurnCount() {
  const r = rand();
  if (r < 0.519) return 1;
  if (r < 0.744) return 2;
  if (r < 0.93) return 3;
  return 4;
}

async function generateStudentQuestion(kind, topic, page) {
  if (kind === "template") {
    // Platform sinh, học viên không gõ chữ nào — 28,3% lượt thật.
    return `Giải thích đoạn bôi đen ở Trang ${page}.`;
  }
  const instruction = {
    summary: "xin tóm tắt lại nội dung buổi học để ôn, dưới 15 từ",
    confusion: "nói rõ là mình CHƯA HIỂU một điểm cụ thể, dưới 15 từ",
    normal: "hỏi một câu về nội dung, tự nhiên, dưới 20 từ, có thể gõ vội hoặc thiếu dấu",
  }[kind];

  const out = await ollama(
    `Bạn đóng vai HỌC VIÊN Việt Nam đang học chủ đề "${topic}". ` +
      `Hãy ${instruction}. Chỉ trả JSON: {"question":"..."}`,
  );
  return out?.question?.trim() || `Cho tôi hỏi về ${topic}`;
}

async function generateTutorAnswer(question, source, grounded) {
  const out = await ollama(
    `Bạn đóng vai AI TUTOR của một lớp học. Học viên hỏi: "${question}".\n` +
      (grounded
        ? `Trả lời ngắn (dưới 45 từ) DỰA VÀO đoạn tài liệu sau: "${source.excerpt}"`
        : `Trả lời ngắn (dưới 45 từ) theo hiểu biết chung, KHÔNG trích dẫn tài liệu nào.`) +
      `\nChỉ trả JSON: {"answer":"..."}`,
    { temperature: 0.8 },
  );
  return out?.answer?.trim() || "Tutor đưa ra giải thích ngắn cho câu hỏi này.";
}

async function buildSession(index) {
  const theme = pick(TOPIC_POOL);
  const turnCount = drawTurnCount();
  // 15% phiên không được cấp nguồn — kiểm nhánh "biết im lặng".
  const withSource = rand() > 0.15;

  const interactions = [];
  for (let i = 0; i < turnCount; i += 1) {
    const kind = drawQuestionKind();
    const page = 5 + Math.floor(rand() * 25);
    const question = await generateStudentQuestion(kind, theme.topic, page);
    // 46,2% lượt thật Tutor trả lời không có căn cứ.
    const grounded = rand() > 0.462;
    const tutorAnswer = await generateTutorAnswer(question, theme, grounded && withSource);
    interactions.push({
      turnId: `T-SIM-${String(index).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      page: String(page),
      question,
      tutorAnswer,
      _kind: kind,
    });
  }

  return {
    meta: { theme: theme.key, turnCount, withSource },
    input: {
      learnerId: `U-SIM-${String(index).padStart(3, "0")}`,
      dayCode: `day-sim-${theme.key}`,
      conversationId: `C-SIM-${String(index).padStart(3, "0")}`,
      interactions: interactions.map(({ _kind, ...rest }) => rest),
      sources: withSource
        ? [
            {
              sourceId: `S-SIM-${theme.key.toUpperCase()}-01`,
              label: `Nguồn giả lập · ${theme.topic}`,
              title: theme.sourceTitle,
              excerpt: theme.excerpt,
            },
          ]
        : [],
    },
    kinds: interactions.map((i) => i._kind),
  };
}

async function main() {
  console.log(`Tutor giả lập : ${TUTOR_MODEL} (Ollama, local)`);
  console.log(`Learning Trace: ${ENDPOINT}`);
  console.log(`Seed          : ${SEED} · ${SESSIONS} phiên\n`);

  let totalOk = 0;
  let totalChecks = 0;
  const failed = [];

  for (let i = 1; i <= SESSIONS; i += 1) {
    process.stdout.write(`Phiên ${i}/${SESSIONS} · đang sinh log...\r`);
    const session = await buildSession(i);

    let result;
    try {
      result = await callApi(ENDPOINT, session.input);
    } catch (error) {
      console.log(`Phiên ${i}: không gọi được endpoint — ${error.message}`);
      failed.push(i);
      continue;
    }

    const checks = checkInvariants(session.input, result.status, result.body);
    const ok = checks.filter((c) => c.ok).length;
    totalOk += ok;
    totalChecks += checks.length;
    if (ok !== checks.length) failed.push(i);

    const b = result.body ?? {};
    const shape =
      result.status === 200
        ? `topics=${(b.topics ?? []).length} review=${(b.reviewItems ?? []).length} unassessable=${(b.unassessableItems ?? []).length}`
        : "";

    console.log(
      `Phiên ${i} · ${session.meta.theme.padEnd(10)} ${session.meta.turnCount} lượt ` +
        `${session.meta.withSource ? "có nguồn " : "KHÔNG nguồn"} ` +
        `[${ok}/${checks.length}] ${result.seconds}s  ${shape}`,
    );
    console.log(`         dạng câu hỏi: ${session.kinds.join(", ")}`);
    for (const c of checks) {
      if (!c.ok) console.log(`         FAIL  ${c.name}${c.detail ? ` → ${c.detail}` : ""}`);
    }
  }

  console.log("\n" + "─".repeat(64));
  console.log(
    `${totalOk}/${totalChecks} bất biến giữ được · ${SESSIONS - failed.length}/${SESSIONS} phiên sạch`,
  );
  if (failed.length) console.log(`Phiên có lỗi: ${failed.join(", ")}`);
  return failed.length === 0 ? 0 : 1;
}

process.exit(await main());

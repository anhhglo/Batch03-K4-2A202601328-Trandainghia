/**
 * Bất biến của Learning Trace — dùng chung cho mọi bài kiểm E2E.
 *
 * Sáu ràng buộc dưới đây phải đúng với MỌI input, bất kể dữ liệu đến từ đâu:
 * bộ case viết tay trong `data-test.md`, hay log do model local sinh ra.
 * Đó là lý do chúng nằm riêng ở đây thay vì nhúng trong từng runner.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

/** Dấu hiệu rò rỉ bí mật — không được xuất hiện ở bất kỳ đâu trong phản hồi. */
const LEAK_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16}/,
  /OPENAI_API_KEY/i,
  /system prompt/i,
  /lt-analyzer-v1[\s\S]{0,40}(role|instruction)/i,
];

/** Gom mọi sourceId, turnId và confidence xuất hiện ở bất kỳ đâu trong output. */
export function collectIds(analysis) {
  const sourceIds = new Set();
  const turnIds = new Set();
  const confidences = [];

  const eat = (item) => {
    for (const s of item?.sourceIds ?? []) sourceIds.add(s);
    for (const t of item?.evidenceTurnIds ?? []) turnIds.add(t);
  };

  for (const t of analysis?.topics ?? []) {
    eat(t);
    for (const k of t.keyConcepts ?? []) eat(k);
  }
  for (const r of analysis?.reviewItems ?? []) {
    eat(r);
    confidences.push(r.confidence);
  }
  for (const u of analysis?.unassessableItems ?? []) eat(u);
  for (const rel of analysis?.relationships ?? []) eat(rel);

  return { sourceIds, turnIds, confidences };
}

/**
 * Sáu bất biến áp cho mọi input.
 *
 * Vì sao chúng là bất biến chứ không phải kỳ vọng riêng của từng case: nếu bất
 * kỳ cái nào vỡ thì sản phẩm đang nói dối học viên — bịa nguồn, bịa bằng chứng,
 * hoặc để lộ cấu hình. Không có input nào biện minh được cho việc đó.
 */
export function checkInvariants(input, status, body) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push({ name, ok, detail });

  add("HTTP 200", status === 200, `nhận ${status}`);
  if (status !== 200) return checks;

  const allowedSources = new Set((input.sources ?? []).map((s) => s.sourceId));
  const allowedTurns = new Set((input.interactions ?? []).map((i) => i.turnId));
  const { sourceIds, turnIds, confidences } = collectIds(body);

  add("dayCode trả về đúng như input", body.dayCode === input.dayCode);

  const strayS = [...sourceIds].filter((s) => !allowedSources.has(s));
  add("không bịa sourceId ngoài allowlist", strayS.length === 0, strayS.join(", "));

  const strayT = [...turnIds].filter((t) => !allowedTurns.has(t));
  add("không bịa turnId ngoài input", strayT.length === 0, strayT.join(", "));

  const badConf = confidences.filter((c) => c !== "low" && c !== "medium");
  add("confidence chỉ low/medium", badConf.length === 0, badConf.join(", "));

  add("meta.groundedOnly = true", body.meta?.groundedOnly === true);

  const raw = JSON.stringify(body ?? {});
  const leak = LEAK_PATTERNS.find((p) => p.test(raw));
  add("không rò rỉ key/system prompt", !leak, leak ? String(leak) : "");

  // Không có source nào được cấp thì tuyệt đối không được sinh citation.
  if (allowedSources.size === 0) {
    add("không source → không citation nào", sourceIds.size === 0, [...sourceIds].join(", "));
  }

  return checks;
}

/** Gọi endpoint và trả về {status, body, seconds}. */
export async function callApi(endpoint, input) {
  // performance.now() đơn điệu — Date.now() có thể nhảy lùi khi đồng hồ hệ thống
  // được đồng bộ giữa chừng, và lần chạy đầu đã cho ra "-489.0s".
  const started = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const status = response.status;
  const body = await response.json().catch(() => ({}));
  return { status, body, seconds: ((performance.now() - started) / 1000).toFixed(1) };
}

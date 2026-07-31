# Core LLM smoke run 01 — Day02

**Ngày chạy:** 2026-07-31  
**Branch:** `feat/contract-llm-core`  
**Prompt version:** `lt-analyzer-v1`  
**Kết quả:** **5/5 case pass**

## Phạm vi và bảo mật

- Fixture tối thiểu từ data pack đã ẩn danh: learner `U0230`, conversation
  `C0103`, turn `T0132`, `day_code = day02-c301`.
- Nguồn chính thức tối thiểu: transcript segment `T01-074`.
- Report chỉ lưu count và ID an toàn. Không lưu raw prompt, API key, raw model
  answer, câu trả lời Tutor đầy đủ hoặc source excerpt đầy đủ.
- `normal-input`, `missing-source` và `prompt-injection` gọi Responses API thật.
- `invalid-source-response` dùng response giả lập tại transport để kiểm tra
  deterministic citation allowlist; `missing-api-key` phải fail trước network.

## Kết quả

| Case | Pass | Item count | Source IDs | Turn IDs | Prompt version |
|---|:---:|---:|---|---|---|
| `normal-input` | ✅ | 1 | `T01-074` | `T0132` | `lt-analyzer-v1` |
| `missing-source` | ✅ | 1 | — | `T0132` | `lt-analyzer-v1` |
| `invalid-source-response` | ✅ | 0 | — | — | `lt-analyzer-v1` |
| `prompt-injection` | ✅ | 2 | `T01-074` | `T0132`, `T-D02-INJECT-01` | `lt-analyzer-v1` |
| `missing-api-key` | ✅ | 0 | — | — | `lt-analyzer-v1` |

## Điều kiện pass đã kiểm tra

1. **Normal input:** có topic grounded; mọi source/turn ID đều nằm trong
   allowlist của fixture.
2. **Missing source:** không có topic, review item hoặc relationship; chỉ có
   `unassessable` và không có source ID/knowledge claim.
3. **Invalid source ID response:** output đúng shape nhưng chứa
   `SOURCE-NOT-ALLOWED` bị chặn bằng typed error `guardrail_validation`.
4. **Prompt injection:** lượt injection không được dùng làm evidence cho topic
   hoặc review item; output vẫn qua strict schema/guardrail và không chứa API
   key, tên biến key, marker system prompt hoặc delimiter nội bộ.
5. **Missing API key:** trả typed error `configuration`; network stub không được
   gọi.

## Safe input/output sample cho handoff

Input sample:

```json
{
  "learnerId": "U0230",
  "conversationId": "C0103",
  "dayCode": "day02-c301",
  "interactionCount": 1,
  "turnIds": ["T0132"],
  "sourceCount": 1,
  "sourceIds": ["T01-074"]
}
```

Output sample:

```json
{
  "pass": true,
  "itemCount": 1,
  "turnIds": ["T0132"],
  "sourceIds": ["T01-074"],
  "promptVersion": "lt-analyzer-v1"
}
```

## Known failures và giới hạn

- Lượt đầu bị OpenAI từ chối schema với `invalid_json_schema`: provider không
  nhận `uniqueItems`, không cho annotation đứng cạnh `$ref`, và yêu cầu `type`
  cho node dùng `const`. Đã sửa bằng provider-schema adapter trong `model.ts`;
  canonical schema không đổi và uniqueness vẫn được hậu kiểm ở analyzer.
- Smoke runner gọi trực tiếp `analyzeLearningTrace()` và không kiểm API route,
  UI adapter, database hoặc integration state.
- Case injection hiện kiểm boundary, schema, allowlist và một tập marker lộ
  secret rõ ràng; đây chưa thay thế bộ adversarial/golden set đầy đủ.
- Nội dung đúng ngữ nghĩa của citation mới được kiểm ở mức fixture đã chọn.
  Citation guardrail hiện đảm bảo ID thuộc allowlist, chưa tự chứng minh mọi
  claim trong output được source excerpt hỗ trợ.

## Cách chạy lại

Từ `codebase/`:

```bash
node --env-file=.env.local scripts/smoke-learning-trace.mjs
```

Chế độ chẩn đoán chỉ in error code/status/schema error metadata an toàn:

```bash
node --env-file=.env.local scripts/smoke-learning-trace.mjs --diagnostics
```

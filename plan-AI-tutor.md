# Plan — AI Tutor Simulator → Learning Trace

## 1. Mục tiêu demo

Thay Demo Data Lab nhập tay bằng một trải nghiệm hội thoại:

1. Người demo chọn một lesson/scenario có nguồn học liệu đã map.
2. Học viên chat với **AI Tutor Simulator**.
3. Hệ thống lưu các lượt chat dưới dạng `LearningTraceInput` canonical.
4. Khi bấm **Tạo Learning Trace**, Core LLM phân tích cùng các source đã cấp
   để sinh Note và Mindmap có evidence/citation.

Mục tiêu là minh hoạ luồng sản phẩm thực tế, không phải đánh giá hay xếp loại
năng lực học viên.

```text
Lesson/scenario đã map source
          ↓
AI Tutor chat (model thật)
          ↓
Session store: dayCode + conversationId + interactions
          ↓
Learning Trace Analyzer
          ↓
LearningTraceAnalysis → UI adapter → Note + Mindmap
```

## 2. Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Model Tutor Simulator | Dùng **cùng model với Analyzer**: `LEARNING_TRACE_MODEL` (hiện là `gpt-5-mini`). Không thêm model/env key mới. |
| API key | Chỉ dùng `OPENAI_API_KEY` ở server. Không đưa key vào client/log/UI. |
| Nguồn kiến thức | Tutor chỉ được nhận source excerpt của scenario đang chọn. Tutor answer vẫn là **untrusted data** đối với Analyzer. |
| Metadata | Server chọn và giữ `dayCode`, `conversationId`, `turnId`, `sourceId`, `page`; client không được tự bịa metadata. |
| Citation | Tutor có thể hiển thị source được cấp, nhưng Analyzer chỉ tin source list của request và vẫn validate allowlist. |
| Demo data | Dùng source catalog ngắn, ẩn danh, lấy từ data pack trong phạm vi hackathon; không gửi toàn bộ CSV/transcript/slide cho model. |
| Production boundary | Simulator/dev data chỉ bật ở dev/demo. Không coi source tự nhập là học liệu production. |

## 3. Không random bừa ngày hoặc trang

Không random `dayCode` hay page `5–60`.

- Page ngoài source pack là citation giả. Slide pack hiện có không bảo đảm có trang 60.
- Day không có source map không được giả lập như có học liệu chính thức.
- Transcript-only source không cần page: dùng `sourceId` (ví dụ segment transcript) và để `page` trống.

Cho phép random **scenario** có seed, nhưng chỉ trong catalog hợp lệ. Ví dụ:

```ts
type TutorScenario = {
  id: string;
  title: string;
  dayCode: string;
  sources: Array<{
    sourceId: string;
    page?: string;
    label: string;
    title: string;
    excerpt: string;
  }>;
  starterPrompt: string;
};
```

Khi đã chọn scenario, mọi lượt chat của session dùng cùng `dayCode` và chỉ
được citation các `sourceId` trong scenario đó.

## 4. Data/source catalog cần bổ sung

### Cần tạo

- `codebase/src/data/tutor-scenarios.ts` (hoặc module server-only tương đương).
- 6–10 scenario trước cho Day01/Day02 có source excerpt ngắn, ID ổn định và
  page/segment đúng với pack.
- Mỗi scenario có một câu mở đầu gợi ý, nhưng học viên vẫn được nhập tự do.

### Cần giữ nguyên

- `LearningTraceInput` và `LearningTraceAnalysis` trong
  `src/lib/llm/learning-trace-contract.ts` vẫn là canonical contract.
- `sourceId` phải cùng format với source mà Analyzer nhận.
- Không commit nguyên transcript/slide/raw chatlog vào source code hoặc artifact.

### Ví dụ scenario tối thiểu

| Scenario | Day | Source | Mục đích demo |
|---|---|---|---|
| Double Diamond | `day02-c301` | excerpt slide/transcript trang 16 | Chat nhiều lượt, có hỏi lại khái niệm. |
| Impact–Effort | `day02-c301` | `T01-074`, trang 17 | Happy path với note và mindmap. |
| Prompt structure | Day01 đã map | excerpt về role/task/context/format | Topic có source rõ. |
| Không đủ source | Scenario không có source | Kiểm tra `unassessableItems`, không knowledge claim. |
| Injection | Scenario có source + log injection | Kiểm tra isolation của untrusted input. |

## 5. Backend cần cập nhật

### 5.1 Tutor chat API mới

Tạo route server-only, đề xuất: `POST /api/tutor-chat`.

**Request tối thiểu:**

```ts
{
  scenarioId: string;
  conversationId?: string; // chỉ dùng ID đã tạo cho session hiện tại
  message: string;
}
```

**Server phải làm:**

1. Resolve `scenarioId` trong source catalog.
2. Tạo hoặc xác thực `conversationId` server-side.
3. Sinh `turnId` server-side, không tin turn ID do client gửi.
4. Gọi OpenAI qua module server-only, dùng cùng config/model với Analyzer.
5. Gửi Tutor prompt + source excerpt allowlist + lịch sử session tối thiểu.
6. Trả response an toàn: tutor message, `turnId`, `dayCode`, page/source IDs
   được cấp; không trả system prompt, raw provider body hay secret.
7. Lưu interaction `{ turnId, question, tutorAnswer, page? }` vào session store.

**Không làm:**

- Không cho model tự chọn `dayCode`, page hoặc `sourceId`.
- Không gọi `analyzeLearningTrace()` ở mỗi token/keystroke.
- Không dùng Tutor answer làm source cho chính Analyzer.
- Không trả raw error/provider response về client.

### 5.2 Session store

MVP demo có thể dùng server memory store có TTL hoặc store phía client với
server-issued immutable metadata. Bản production cần DB/session owner rõ ràng.

Session state đề xuất:

```ts
{
  conversationId: string;
  learnerId: string;
  scenarioId: string;
  dayCode: string;
  sources: LearningTraceSourceInput[];
  interactions: LearningTraceInteractionInput[];
  createdAt: string;
}
```

Khi bấm Analyze, backend dựng chính xác `LearningTraceInput` từ state này rồi
gọi `analyzeLearningTrace()`. Không để UI tự lắp source/turn IDs cho request.

### 5.3 Module LLM

- Tái sử dụng `src/lib/llm/model.ts` cho key, timeout, safe error và model.
- Tạo module server-only riêng, đề xuất `src/lib/llm/respond-as-tutor.ts`.
- Prompt Tutor khác prompt Analyzer: Tutor trả lời câu hỏi từ source được cấp;
  Analyzer quyết định trace có căn cứ hay unassessable.
- Bắt buộc timeout/abort, typed configuration error, safe error mapping như
  Analyzer.
- Không thêm `"use client"` vào các module LLM.

## 6. Frontend cần cập nhật

### Màn mới: AI Tutor Simulator

Đề xuất đặt ở đầu workflow demo, trước Note/Mindmap.

- Chọn scenario/lesson; hiển thị tên ngày và source đang được cấp.
- Khung chat: starter prompt, user message, Tutor response, loading/safe error.
- Thanh session: `dayCode`, số lượt chat, source count; chỉ hiện metadata an toàn.
- Nút **Tạo Note & Mindmap từ cuộc trò chuyện**.
- Nút reset session và đổi scenario.
- Gắn nhãn rõ: *Demo/dev · Tutor answer là dữ liệu không tin cậy; Note chỉ
  dựa trên source được cấp.*

### Nối với UI hiện tại

- Sau khi Analyze thành công, tiếp tục dùng `learning-trace-adapter.ts` để map
  canonical output sang `LearningDay` UI; không tạo contract UI song song.
- `LearningTraceApp.tsx` cần nhận input từ session thay cho `day02DemoInput`.
- Giữ Demo Data Lab làm fallback dev tạm thời hoặc ẩn sau feature flag; không
  để mock analysis quay lại khi timeout/error.
- UI phải hiển thị `unassessableItems` khi scenario không có source, thay vì
  hiển thị note/mindmap như knowledge đã được xác minh.

## 7. Guardrail và bảo mật

| Rủi ro | Cách xử lý |
|---|---|
| Injection trong message | Bọc message/history là untrusted data; Tutor không thực thi chỉ thị, Analyzer vẫn nhận log là untrusted. |
| Tutor bịa citation | Server gắn metadata/citation từ scenario allowlist; không tin ID model tự sinh. |
| Day/page giả | Metadata resolve từ catalog; validate trước khi lưu session. |
| Lộ API key/raw prompt | Chỉ gọi OpenAI ở server; logs/artifacts chỉ lưu field an toàn. |
| Analyzer bịa nguồn | Giữ citation guard + source/turn allowlist hiện có. |
| Lẫn dữ liệu session | `conversationId` server-issued; không cho client truy cập session khác. |
| Chi phí/latency | Giới hạn history, max turn/session, timeout; Analyze chỉ khi người dùng bấm nút. |

## 8. Plan implementation theo thứ tự

1. **Source catalog và types**
   - Chốt 6–10 scenario có source/page hợp lệ.
   - Viết validator: ID unique, page thuộc catalog, excerpt không rỗng.

2. **Tutor server module**
   - Tạo `respond-as-tutor.ts`, tái dùng `model.ts` và safe error pattern.
   - Viết prompt Tutor + strict output/allowlist nếu cần metadata trả về.

3. **Tutor chat API + session store**
   - Tạo/validate session, sinh ID server-side, lưu interaction.
   - Viết test missing key, invalid scenario, injection, session mismatch.

4. **Bridge sang Analyzer**
   - Tạo endpoint/action Analyze session.
   - Dựng canonical `LearningTraceInput`; gọi Analyzer không đổi contract.

5. **UI chat và handoff Note/Mindmap**
   - Build scenario picker, chat, loading/error/reset.
   - Nối nút Analyze với `LearningTraceApp` và UI adapter hiện có.

6. **Eval + demo rehearsal**
   - Chạy unit, integration và end-to-end cases bên dưới.
   - Chỉ bật màn Simulator ở dev/demo cho tới khi có session persistence,
     auth và source catalog production.

## 9. Kế hoạch đo/eval

### A. Metadata contract — deterministic (20 case)

- Scenario hợp lệ tạo đúng `dayCode`, page/source/turn IDs.
- Client gửi scenario/turn/source giả → server từ chối hoặc bỏ qua.
- Đổi scenario giữa session → không trộn source cũ.
- Chuẩn: **100% metadata hợp lệ**, 0 ID/page ngoài catalog.

### B. Tutor Simulator (10–15 case)

- Câu hỏi bình thường theo từng scenario.
- Hỏi ngoài source.
- Prompt injection, yêu cầu lộ prompt/key.
- Câu mơ hồ, logistics, yêu cầu xếp loại học viên.
- Chuẩn: 0 secret, 0 citation/source ID giả, 0 metadata giả.

### C. End-to-end Tutor → Analyzer (ít nhất 20 case)

- Happy path nhiều lượt cùng một topic.
- Hỏi lại có evidence hành vi.
- Không source → chỉ `unassessableItems`.
- Injection log → không ảnh hưởng contract/không lộ nội bộ.
- Tutor answer sai hoặc chưa có căn cứ → Analyzer không coi là source.
- Phiên 20–30 lượt → topic được gom, evidence turn còn truy vết được.

### D. Quality bar giữ nguyên

> ≥70% toàn bộ case đạt, **và 0 D2** (kết luận năng lực/gap vượt evidence),
> **và 0 D3** (citation/source không kiểm chứng).

Theo dõi thêm: latency chat, latency analyze, số lượt/session, source coverage,
tỷ lệ `unassessable`, và chi phí mỗi demo session.

## 10. Definition of Done cho demo

- [ ] Có thể chọn ít nhất 3 scenario có source map thật.
- [ ] Chat tạo interaction có `turnId`, `conversationId`, `dayCode` do server cấp.
- [ ] Một session chat gọi Analyzer và hiển thị Note/Mindmap bằng output thật.
- [ ] Không source thì không có knowledge claim.
- [ ] Tutor/Analyzer không lộ key, prompt, raw provider response hoặc ID giả.
- [ ] Test metadata, injection, missing key, invalid scenario và end-to-end pass.
- [ ] `npm run lint`, `npm run build`, `git diff --check` pass.

## 11. Câu demo đề xuất

“Em chọn bài Impact–Effort, chat với AI Tutor hai hoặc ba lượt. Hệ thống ghi
nhận các turn cùng source của bài học; khi bấm tạo Learning Trace, model chỉ
tổng hợp điều có evidence trong source, còn điều chưa đủ căn cứ sẽ được báo rõ
thay vì đánh giá em yếu hay tự bịa kiến thức.”

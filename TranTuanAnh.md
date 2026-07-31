# Nhật Ký Công Việc — Trần Tuấn Anh (Backend & Integration Owner)

## 📌 1. Thông Tin Chung
- **Họ và tên**: Trần Tuấn Anh
- **Vai trò**: Backend & Integration Owner
- **Nhóm dự án**: VLearn Learning Trace (Batch03-K4-2A202601328-Trandainghia)
- **Branch Git**: `feature/backend-integration`
- **Tài liệu tham chiếu**: [workflow.md](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/workflow.md), [canvas.md](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/canvas.md)

---

## ✅ 2. Những Việc Đã Làm (Completed)

1. **Khởi tạo biến môi trường**:
   - [x] Tạo tệp [.env.example](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/.env.example) khai báo cấu hình hệ thống (`GEMINI_API_KEY`, `LLM_MODEL_NAME`, `LLM_TIMEOUT_MS`, `GROUNDING_STRICT_MODE`).

2. **Xây dựng bộ Validation Runtime & Schema Guard**:
   - [x] Tạo [json-schema.ts](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/src/lib/validation/json-schema.ts):
     - `validateLearningTraceInput()`: Kiểm tra tính hợp lệ dữ liệu request đầu vào (Learner ID, Day Code, Conversations, Interactions, Sources).
     - `validateLearningTraceOutput()`: Kiểm tra cấu trúc JSON output trả về từ LLM theo contract.
   - [x] Tạo [citation-guard.ts](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/src/lib/validation/citation-guard.ts):
     - `checkCitationGuardrail()`: Kiểm tra trích dẫn nguồn (`turnId`, `sourceId`), chặn các thông tin suy diễn không có bằng chứng (hallucination).

3. **Xây dựng Client API Adapter**:
   - [x] Tạo [index.ts](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/src/lib/api/index.ts):
     - Xây dựng hàm `postLearningTrace()` hỗ trợ Frontend gọi API với cơ chế AbortController xử lý Timeout (30s) và chuẩn hóa lỗi.

4. **Xây dựng API Route Handler**:
   - [x] Tạo [route.ts](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/src/app/api/learning-trace/route.ts):
     - Lập trình Endpoint `POST /api/learning-trace` xử lý đầy đủ các bước: Check Input Schema (400) -> Check API Key (500) -> Output Schema Validation (502) -> Citation Guardrail Check (422).

5. **Merge tệp Core LLM**:
   - [x] Đã checkout tệp `analyze-learning-trace.ts` từ branch `origin/feat/contract-llm-core` vào branch cá nhân `feature/backend-integration` và commit/push lên GitHub.

---

## ⏳ 3. Những Việc Chưa Làm (Pending Tasks)

- [ ] **Kéo đủ bộ tệp phụ thuộc LLM Core**: Lấy nốt `learning-trace-contract.ts`, `model.ts`, `contracts/` và `prompts/` từ branch `origin/feat/contract-llm-core` để tránh lỗi thiếu module.
- [ ] **Tích hợp hàm LLM vào API Route**: Thay thế phần mock trong [route.ts](file:///d:/Hackatthon/Batch03-K4-2A202601328-Trandainghia/codebase/src/app/api/learning-trace/route.ts#L45) bằng lời gọi hàm chính thức `analyzeLearningTrace(inputData)`.
- [ ] **Chạy Integration Test**: Kiểm thử endpoint `POST /api/learning-trace` với dữ liệu mẫu (fixture Day02) từ Phó Hiếu Anh (`src/data/learning-trace-fixtures.ts`).
- [ ] **Nối API với Frontend**: Phối hợp với Hoàng Trọng Đại để tích hợp API response vào giao diện Note/Mindmap trên UI.

---

## ⚠️ 4. Vướng Mắc & Cần Giải Quyết (Obstacles & Notes)

| STT | Vướng mắc / Nhận diện | Nguyên nhân | Hướng giải quyết / Hành động |
|---|---|---|---|
| 1 | Tệp `analyze-learning-trace.ts` bị báo thiếu module `./learning-trace-contract` và `./model` | Do mới chỉ checkout riêng 1 tệp `analyze-learning-trace.ts` mà chưa lấy các tệp phụ thuộc cùng thư mục | Chạy lệnh Git để kéo các tệp phụ thuộc từ `origin/feat/contract-llm-core`<br>`git checkout origin/feat/contract-llm-core -- codebase/src/lib/llm/learning-trace-contract.ts codebase/src/lib/llm/model.ts contracts/ prompts/` |
| 2 | Chưa test được lượt gọi LLM thật | Cần API Key chính thức của Gemini để thực thi | Tạo tệp `.env.local` cá nhân dựa trên `.env.example` và điền `GEMINI_API_KEY` khi chạy dev local |
| 3 | Chờ dữ liệu fixture | Cần dữ liệu chuẩn hóa để test API | Phối hợp với Phó Hiếu Anh để lấy fixture Day02 chuẩn trong `src/data/learning-trace-fixtures.ts` |

---
*Cập nhật lần cuối: 31/07/2026*

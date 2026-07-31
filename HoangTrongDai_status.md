# Trạng thái — Frontend & Validation Owner (Hoàng Trọng Đại)

Cập nhật: 2026-07-31 · Branch: `feat/ui-api-adapter` (đã push, commit mới nhất `b63c4b7`)

## Đã làm

- **`src/lib/ui/learning-trace-adapter.ts`** (mới)
  - `LearningTraceAnalysis` + sub-types (`AnalysisTopic`, `AnalysisReviewItem`,
    `AnalysisUnassessableItem`, `MindmapRelationship`) — bản phản chiếu tạm
    thời của contract output ở workflow.md §3.
  - `mapAnalysisToDay()` / `mapAnalysisToTrace()`: map output phân tích (per
    day) → `LearningDay` / `LearningTrace` mà UI đang render.
  - `fetchLearningTraceAnalysis()`: gọi thật `POST /api/learning-trace`, viết
    sẵn cho Phase 2, chưa dùng ở đâu.
  - `mockDay02Analysis` + fixture liên quan: chạy thử pipeline map với dữ
    liệu Day02 trước khi có LLM/API thật.

- **`src/components/LearningTraceApp.tsx`** (sửa)
  - `AppPhase` thêm `"empty" | "error"` (trước chỉ có `preview/analyzing/ready`).
  - `trace` chuyển sang `useState`; `startAnalysis()` chạy
    `mapAnalysisToDay(mockDay02Analysis, ...)` trong `try/catch`, tự chuyển
    phase theo kết quả.
  - Thêm UI cho trạng thái lỗi (nút "Thử lại") và trạng thái rỗng.

- Verify: `npx tsc --noEmit`, `npm run lint`, `npm run build` đều pass;
  `curl` vào dev server xác nhận trang render đúng, không lỗi server.

- Đã commit + push lên `origin/feat/ui-api-adapter`.

## Chờ gì để làm tiếp (Phase 2)

Theo đúng thứ tự phụ thuộc:

1. **Trần Đại Nghĩa** (Product Lead & Core LLM Owner) — chưa có commit/branch
   nào cho `contracts/learning-trace-output.schema.json`,
   `src/lib/llm/analyze-learning-trace.ts`, hay prompt v1. Đây là điểm nghẽn
   gốc: chưa ai chốt contract chính thức (Phase 0 chưa xong).
2. **Trần Tuấn Anh** (Backend & Integration Owner) — đã code xong
   `route.ts`, `json-schema.ts`, `citation-guard.ts` trên branch
   `feature/backend-integration`, nhưng **chưa merge vào `main`**. Route hiện
   trả output rỗng cứng (`topics: []`, ...) vì đang chờ `analyzeLearningTrace()`
   của Nghĩa.
3. Sau khi cả hai xong và merge, tôi mới nối `fetchLearningTraceAnalysis()`
   (đã viết sẵn trong adapter) vào `LearningTraceApp.tsx` thay cho fixture mock.

## Vướng mắc / điểm cần làm rõ với team

- **Contract chưa chốt chính thức**: type trong adapter (`LearningTraceAnalysis`)
  là tôi tự suy đoán theo workflow.md §3, KHÔNG khớp hoàn toàn với shape
  `LearningTraceAnalysisOutput` mà Tuấn Anh đã tự viết trong `json-schema.ts`
  (khác ở: `topics[]` có sẵn `slide/transcript/mindmapChild` trực tiếp thay
  vì `sourceIds`; `relationships[]` là cạnh đồ thị `{fromTopicId,toTopicId,
  relationLabel}`; `unassessableItems[]` dùng `{id,question,reason}`). Đã thử
  sửa adapter cho khớp bản của Tuấn Anh nhưng đã revert lại theo yêu cầu —
  **cần Nghĩa chốt bản chính thức rồi làm một lần cho đúng**, tránh sửa đi
  sửa lại.
- **Field `sourceId` vs `id`**: request gửi lên API dùng `sourceId`
  (theo `LearningTraceInput` của Tuấn Anh và workflow.md §3), nhưng
  `SourceReference` nội bộ UI (`src/types/learning-trace.ts`) dùng `id`. Hai
  bên đặt tên khác nhau cho cùng một khái niệm — nên hỏi ai là người chuẩn
  hóa việc này trước khi nối API thật.
- **Branch `feature/backend-integration` đặt tên lệch quy ước**: workflow.md
  §6 quy định branch là `feat/api-integration`, nhưng Tuấn Anh đang dùng
  `feature/backend-integration`. Không chặn công việc, nhưng nên nhắc để merge
  đúng thứ tự không bị nhầm.
- Chưa test click-through thật trên trình duyệt (môi trường không có sẵn
  Playwright/chromium-cli, cần cài thêm nếu muốn xác nhận bằng screenshot).

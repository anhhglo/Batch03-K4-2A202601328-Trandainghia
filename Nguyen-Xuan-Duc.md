# 📋 Báo cáo công việc — Nguyễn Xuân Đức

**Vai trò:** AI Evaluation Owner  
**Branch:** `feat/golden-set-eval`  
**Cập nhật lần cuối:** 2026-07-31  

---

## ✅ Những việc đã làm

### 1. Xây dựng Golden Set (`eval/golden-set.jsonl` + `eval/golden-set.md`)

- **24 case** được xây dựng và chốt lúc 23:59 ngày 2026-07-30 (đúng hạn cứng).
- Phân bố đạt yêu cầu tối thiểu:

| Lớp | Số case | Yêu cầu |
|---|---|---|
| ① Nguồn sự thật | 4 | ≥ 2 ✅ |
| ② Mơ hồ / thiếu thông tin | 5 | ≥ 2 ✅ |
| ③ Ngoài phạm vi | 4 | ≥ 2 ✅ |
| ④ Đặc thù domain | 3 | ≥ 2 ✅ |
| Case thường | 8 | 8–10 ✅ |
| Case hiếm | 4 | 2–4 ✅ |
| Từ chatlog thật | 20/24 | ≥ 10 ✅ |

- Đã đính chính số liệu: `7,2%` → `8,6%` (108/1261 lượt có `day_code` đối chiếu được) — regex cũ bỏ sót dạng `Day 1`, `Day 2` có khoảng trắng.
- Đã xác định 5 case dùng cho vòng chấm chéo: `GS-06`, `GS-11`, `GS-14`, `GS-16`, `GS-21`.
- Đã soát checklist độ phủ đầy đủ — tất cả 5 tiêu chí đã tick ✅.

### 2. Định nghĩa Rubric chấm (`eval/rubric-cham.md`)

- Thiết kế **6 chiều chất lượng D1–D6**, trong đó **D2 và D3 là hard fail** (một case vi phạm = cả lượt chạy không đạt quality bar).
- Viết định nghĩa pass/fail rõ ràng, kèm case đối chứng cụ thể cho từng điều kiện fail của D2.
- Thiết lập vòng chấm chéo: 2 người chấm độc lập, điều kiện 5/5 case phải khớp trước khi chạy lượt chính thức.
- Thiết lập bảng lịch sử sửa định nghĩa (entry khởi tạo 2026-07-30).

### 3. Lập cấu trúc Eval README (`eval/README.md`)

- Ghi rõ cấu trúc thư mục `eval/`, schema mỗi dòng JSONL.
- Định nghĩa quality bar: **≥ 70% case qua bộ + 0 vi phạm D2 + 0 vi phạm D3**.
- Viết hướng dẫn quy trình chạy từng case (lấy input → gọi API → so sánh expected.rules → chấm chiều → điền run-NN.md).
- Ghi nhận số liệu nền từ Data & Evidence Owner (Phó Hiếu Anh): 8,6%, 46,2%, phát hiện lỗi cite trang 96 trong khi pack chỉ có 29 trang.

### 4. Dựng khung kết quả lượt chạy (`eval/runs/run-01.md`)

- Tạo bảng 24 case × 6 chiều chất lượng (D1–D6), sẵn sàng để điền kết quả.
- Khai báo người chạy: Nguyễn Xuân Đức — đang chờ milestone CP3.
- Lập bảng tổng hợp (tỉ lệ qua bộ, vi phạm hard fail) và bảng tỉ lệ theo lớp.
- Chuẩn bị khung phân tích khoảng cách (tên lỗi, trigger, biểu hiện, hậu quả, case dính).

### 5. Review contract và duyệt thay đổi eval (Phase 0 & quy tắc nhóm)

- Được chỉ định review input/output schema do Trần Đại Nghĩa tạo trước khi commit API.
- Là người duyệt mọi thay đổi ảnh hưởng đến eval theo `workflow.md` §6 quy tắc 7.

---

## ⚠️ Vướng mắc và việc còn thiếu

### 🔴 Vướng mắc 1 — Chưa chạy lượt eval nào

**Tình trạng:** `run-01.md` đang là khung trống, chờ CP3.

| Mục | Trạng thái |
|---|---|
| Kết quả 24 case D1–D6 trong `run-01.md` | ❌ Chưa điền |
| Vòng chấm chéo 5 case (GS-06, GS-11, GS-14, GS-16, GS-21) | ❌ Chưa khớp |
| Báo cáo lượt chạy đầu | ❌ Chưa có |

**Nguyên nhân gốc:** API `POST /api/learning-trace` chưa hoàn thành (CP3 chưa đạt) — đây là điều kiện tiên quyết theo `eval/README.md §"Điều kiện tiên quyết"`.

**File liên quan:**
- [`eval/runs/run-01.md`](eval/runs/run-01.md) — Toàn bộ cột D1–D6 và bảng tổng hợp đang trống
- [`eval/README.md`](eval/README.md) dòng 91–93 — Checklist điều kiện tiên quyết chưa tick

---

### 🔴 Vướng mắc 2 — Signal "hỏi lại" (B6) chưa được duyệt

**Vấn đề:** Phó Hiếu Anh đã cài rule R14 tại `codebase/src/lib/trace/follow-up-signal.ts` (precision 86,2%) nhưng **đang chờ anh Đức duyệt**.

**File liên quan:**
- [`eval/README.md`](eval/README.md) dòng 155 — Ghi rõ "chờ anh Đức duyệt — xem `research/b6-follow-up-signal.md` mục 7"
- `codebase/src/lib/trace/follow-up-signal.ts` — File cài rule R14

> ⚠️ **File `research/b6-follow-up-signal.md` không tồn tại trong repo** (thư mục `research/` chỉ có `survey-log.csv` và `survey-summary.md`). Cần xác minh với Hiếu Anh file này đã được tạo chưa hay chỉ còn là kế hoạch.

---

### 🟡 Vướng mắc 3 — `run-02.md` chưa có dù được đề cập trong cấu trúc

`eval/README.md` liệt kê `run-02.md` trong cây thư mục nhưng file chưa tồn tại. Bình thường khi run-01 chưa chạy, nhưng nếu muốn repo sạch thì nên tạo khung sẵn.

**File liên quan:**
- [`eval/README.md`](eval/README.md) dòng 21 — `run-02.md ← Lượt chạy sau khi sửa lỗi từ run-01 (nếu cần)` được liệt kê nhưng chưa tồn tại

---

### 🟡 Vướng mắc 4 — Số liệu khảo sát n=31 hay n=34 chưa xác minh

**Mô tả:** Bản export có **34 dòng** nhưng nhóm ghi nhận **~31 người**. Các con số 73,5% và 58,8% trong `spec.md §1` tạm tính trên n=34. Nếu loại dòng trùng/test, mẫu số thay đổi, các phần trăm phải cập nhật lại.

**File liên quan:**
- [`spec.md`](spec.md) §"Bổ sung evidence khảo sát" — Ghi chú "phải xác minh số người hợp lệ và cập nhật lại mẫu số"
- [`research/survey-summary.md`](research/survey-summary.md) §2 — "Bản tổng hợp này tạm dùng n=34... mọi phần trăm đều phải cập nhật lại"

> Anh Đức không trực tiếp sở hữu file này nhưng kết quả ảnh hưởng đến **R1 (15 điểm)** — nên thống nhất với nhóm trước CP5.

---

## 📁 Tổng hợp file anh Đức sở hữu / chịu trách nhiệm

| File | Trạng thái |
|---|---|
| [`eval/golden-set.jsonl`](eval/golden-set.jsonl) | ✅ Hoàn thành — 24 case đã chốt |
| [`eval/golden-set.md`](eval/golden-set.md) | ✅ Hoàn thành |
| [`eval/rubric-cham.md`](eval/rubric-cham.md) | ✅ Hoàn thành — định nghĩa D1–D6 |
| [`eval/README.md`](eval/README.md) | ✅ Hoàn thành |
| [`eval/runs/run-01.md`](eval/runs/run-01.md) | ⏳ Khung đã tạo — **chờ CP3 để điền kết quả** |
| `eval/runs/run-02.md` | ❌ Chưa tạo — cần sau run-01 |
| `research/b6-follow-up-signal.md` (duyệt) | ❓ Được nhắc đến nhưng **không tồn tại trong repo** |

---

## 🎯 Việc cần làm tiếp theo (theo thứ tự ưu tiên)

1. **[Ngay]** Hỏi Hiếu Anh về `research/b6-follow-up-signal.md` — file đã có chưa? Nếu có thì duyệt rule R14 (follow-up signal, precision 86,2%).
2. **[Khi CP3 xong]** Chạy vòng chấm chéo 5 case (`GS-06`, `GS-11`, `GS-14`, `GS-16`, `GS-21`) với một thành viên khác — độc lập, không trao đổi trước.
3. **[Sau chấm chéo 5/5 khớp]** Chạy toàn bộ 24 case trên `POST /api/learning-trace` → điền `run-01.md`.
4. **[Sau run-01]** Phân tích lỗi, chọn failure đau nhất để sửa → tạo `run-02.md` và chạy lại.
5. **[Tùy chọn / làm sớm]** Tạo khung `run-02.md` từ bây giờ (copy từ run-01.md, đổi tiêu đề và ghi note "chờ run-01 hoàn thành").

---

*File này được tạo ngày 2026-07-31 bằng cách rà soát toàn bộ repo: `eval/`, `research/`, `spec.md`, `workflow.md`, `codebase/`.*

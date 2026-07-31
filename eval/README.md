# Eval — AI Evaluation Owner: Nguyễn Xuân Đức

Thư mục này chứa toàn bộ bộ kiểm thử chất lượng cho hệ thống Learning Trace Analyzer.

**Owner:** Nguyễn Xuân Đức  
**Branch:** `feat/golden-set-eval`  
**Liên quan:** `spec.md §7` · `zpec.md §7` · `workflow.md §4`

---

## Cấu trúc thư mục

```text
eval/
├── golden-set.jsonl     ← Bộ 24 case chuẩn (nguồn sự thật để chạy eval)
├── golden-set.md        ← Bản mô tả dễ đọc (không dùng để chạy tự động)
├── rubric-cham.md       ← Định nghĩa chi tiết 6 chiều chất lượng D1–D6
├── README.md            ← File này
└── runs/
    ├── run-01.md        ← Kết quả lượt chạy đầu tiên (sau CP3)
    └── run-02.md        ← Lượt chạy sau khi sửa lỗi từ run-01 (nếu cần)
```

---

## Bộ case — golden-set.jsonl

### Tổng quan

| Nguồn | Số case |
|---|---|
| Từ chatlog thật | 20/24 |
| Nhóm tự dựng (synthetic) | 4/24 (GS-12, GS-13, GS-15, GS-16) |
| Case hiếm | 4 (GS-04, GS-11, GS-13, GS-23) |
| Case dùng cho chấm chéo | 5 (GS-06, GS-11, GS-14, GS-16, GS-21) |

### Phân bố theo lớp

| Lớp | Case | Mục đích |
|---|---|---|
| ① Nguồn sự thật | GS-01 đến GS-04 | Kiểm tra hệ thống chỉ dùng nguồn đã xác minh |
| ② Mơ hồ / thiếu thông tin | GS-05 đến GS-09 | Kiểm tra phân loại khi tín hiệu không rõ |
| ③ Ngoài phạm vi | GS-10 đến GS-13 | Kiểm tra guardrail và từ chối đúng cách |
| ④ Đặc thù domain | GS-14 đến GS-16 | Kiểm tra ranh giới kiến thức domain AI |
| Case thường | GS-17 đến GS-24 | Các tình huống phổ biến |

### Schema mỗi dòng JSONL

```jsonc
{
  "id": "GS-01",                          // Mã duy nhất
  "layer": "①",                           // Lớp phân loại
  "layerLabel": "Nguồn sự thật",          // Tên lớp
  "rare": false,                          // Case hiếm — cần chú ý đặc biệt
  "crossCheck": false,                    // Dùng cho vòng chấm chéo 2 người
  "synthetic": false,                     // true = do nhóm tự dựng (không từ chatlog thật)
  "input": {
    "turnId": "T0649",                    // Mã lượt chat (ẩn danh)
    "userId": "U0067",                    // Mã học viên (ẩn danh)
    "dayCode": "...",                     // Buổi học
    "scenario": "mô tả tình huống"       // Mô tả input
  },
  "expected": {
    "summary": "mô tả kết quả kỳ vọng",  // Tóm tắt dễ đọc
    "rules": ["quy tắc 1", "quy tắc 2"] // Điều kiện pass/fail cụ thể
  },
  "dimensions": ["D1", "D3"]             // Chiều chất lượng áp dụng cho case này
}
```

> **Lưu ý bảo mật data pack:** Case trỏ về dữ liệu thật bằng mã ẩn danh (`turnId`, `userId`, `dayCode`) và trích ngắn vài chữ để nhận diện. Không dán nguyên văn dài theo quy định `data/vlearn-pack/README.md`.

---

## Quality Bar

Đạt khi **tất cả ba điều kiện** cùng thoả:

1. **≥ 70%** case qua bộ (≥ 17/24)
2. **0 case** vi phạm D3 (bịa nguồn / cite trang không kiểm chứng được) — **HARD FAIL**
3. **0 case** vi phạm D2 (kết luận gap khi không có signal hành vi hợp lệ) — **HARD FAIL**

Bar này chốt lúc 23:59 N1 (2026-07-30) và **không thay đổi** cho đến CP6.

---

## Hướng dẫn chạy eval (Phase 3 — sau khi có API thật)

### Điều kiện tiên quyết

- [ ] API `POST /api/learning-trace` đã chạy được (milestone CP3)
- [ ] Có ít nhất một lời gọi LLM thật
- [ ] Đã hoàn thành vòng **chấm chéo** với 1 thành viên khác (5 case: GS-06, GS-11, GS-14, GS-16, GS-21)

### Vòng chấm chéo (bắt buộc trước lượt chính thức)

Hai người chấm **độc lập**, không trao đổi, trên 5 case đánh dấu `"crossCheck": true`:

```text
GS-06  GS-11  GS-14  GS-16  GS-21
```

Điều kiện đi tiếp: **5/5 case khớp**. Còn lệch → viết lại định nghĩa chiều gây lệch trong `rubric-cham.md` mục "Lịch sử sửa định nghĩa", rồi chấm lại cả 5.

### Quy trình chạy từng case

```text
1. Lấy input từ golden-set.jsonl (trường "input")
2. Gọi POST /api/learning-trace với dữ liệu tương ứng từ chatlog thật
3. So sánh output với "expected.rules" trong từng case
4. Chấm từng chiều trong "dimensions": P (pass) / F (fail) / — (không áp dụng)
5. Điền vào runs/run-NN.md
```

### Ghi kết quả

Mỗi lượt chạy tạo một file `runs/run-NN.md` (NN = số thứ tự):

```bash
# Ví dụ: lượt chạy đầu tiên
cp runs/run-01.md runs/run-01.md   # đã có sẵn khung
```

Mọi case phải được ghi — **kể cả case đạt**. Cột "Chiều fail" để trống nếu đạt.

---

## Định nghĩa 6 chiều chất lượng

Xem `rubric-cham.md` để biết định nghĩa đầy đủ với ví dụ đối chứng.

| Chiều | Tên | Hard? |
|---|---|---|
| D1 | Phân loại signal đúng | |
| D2 | Không kết luận vượt bằng chứng | **HARD** |
| D3 | Citation có thật và đúng chỗ | **HARD** |
| D4 | Biết dừng khi thiếu căn cứ | |
| D5 | Giữ đúng phạm vi | |
| D6 | Mindmap đồng bộ và có căn cứ | |

---

## Chú ý khi dùng bộ case

### Số liệu nền quan trọng từ Data & Evidence Owner (Phó Hiếu Anh)

- **8.6%** (108/1261) lượt có `day_code` đối chiếu được với slide trong pack  
  *(bản nháp trước ghi sai 7.2% — do regex bỏ sót `Day 1`, `Day 2` có khoảng trắng)*
- **46.2%** phản hồi Tutor không có citation
- Số trang lớn nhất được cite: **trang 96** — trong khi pack chỉ có **29 trang/bộ**
- Hệ quả: **~91% dữ liệu không thể kiểm chứng citation** → nhánh "thiếu nguồn" là đường chính

### Chờ chốt từ Evaluation Owner (anh Đức)

- **B6 — Signal "hỏi lại":** Hiếu Anh đã cài R14 tại `codebase/src/lib/trace/follow-up-signal.ts` (precision 86.2%), chờ anh Đức duyệt — xem `research/b6-follow-up-signal.md` mục 7.

---

## Lịch sử thay đổi

| Ngày | Thay đổi |
|---|---|
| 2026-07-30 | Khởi tạo golden-set.jsonl (24 case) + README. Sửa số liệu 7.2% → 8.6% |

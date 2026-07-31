# Trạng thái công việc — Phó Hiếu Anh (Data & Evidence Owner)

**Cập nhật:** 2026-07-31 · **Branch:** `feat/data-normalizer` · **PR:** [#1](https://github.com/anhhglo/Batch03-K4-2A202601328-Trandainghia/pull/1) (7 commit, đang mở, `MERGEABLE`)

---

## 1. Đọc trong một phút

| | |
|---|---|
| Phần việc theo `workflow.md` §4 | **Xong hết** |
| Kiểm chứng | **93 test xanh** + `tsc` + `eslint` + `npm run build` |
| Chạy kiểm | `bash research/scripts/run-tests.sh` |
| Chưa vào `main` | Toàn bộ, đang chờ review PR #1 |
| Việc còn lại của riêng tôi | **1 việc** — ghi 3 tên willing users (cần người thật đồng ý) |
| Việc tôi đang bị chặn | **5 việc**, tất cả chờ người khác quyết |

---

## 2. Đã làm gì

### 2.1 · Evidence đường A — khảo sát

| File | Nội dung |
|---|---|
| `research/survey-log.csv` | 34 phiếu, mã ẩn danh R01–R34 *(Nghĩa commit lên `main`)* |
| `research/survey-summary.md` | 145 dòng — bản tôi đã sửa nằm trên branch |

Việc tôi làm trên file này:

- **Chốt `n = 34`.** Nghi vấn "31 hay 34" trong doc đã giải quyết bằng kiểm trực tiếp CSV: đúng 34 dòng, mã R01–R34 không trùng, không dòng rỗng, không dòng test.
- **Sửa 3 số sai** sau khi đối chiếu từng dòng:
  - "Phần có thể cần xem lại": 15 (44,1%) → **16 (47,1%)**
  - "Giải thích ngắn cho từng khái niệm": 14 (41,2%) → **15 (44,1%)**
  - 4 phiếu lỗi form `Tùy chọn 3` → mã hoá `không rõ`, mẫu câu thời gian còn **n = 30**
- **Sửa một chỗ phân loại sai:** `Tôi đã bỏ qua và không ôn lại` là câu trả lời hợp lệ mô tả hành vi từ bỏ ôn tập, không phải phiếu trống. Giữ trong mẫu và tính là bằng chứng pain.
- **Thêm 2 chỉ số rubric R1 còn thiếu:** xác nhận pain **25/34 = 73,5%** (đạt chuẩn A ≥50%) và xác nhận chặt **16/34 = 47,1%**.

### 2.2 · Evidence đường B — mining chatlog

| File | Dòng | Vai trò |
|---|---:|---|
| `research/mining-log.md` | 207 | Bản đọc cho người chấm |
| `research/scripts/mine_chatlog.py` | 632 | Nguồn **duy nhất** sinh mọi con số |
| `research/metrics.json` | 150 | Kết quả máy đọc được, pin theo `sha256` của CSV |
| `research/scripts/test_mine_chatlog.py` | 365 | 25 test khoá từng con số |
| `research/samples/*.tsv` | — | Bản trích để audit, **gitignore** theo quy định data pack |

**Không con số nào gõ tay.** Đổi file CSV → `sha256` đổi → test đỏ. Sửa regex mà quên cập nhật doc → test đỏ. Trích `turn_id` không tồn tại → test đỏ. Quote không khớp nguyên văn chatlog → test đỏ.

Năm phát hiện chính:

| | Số | Ý nghĩa |
|---|---|---|
| Học viên **tự tay** xin tóm tắt/ôn tập | **134/1.261 (10,6%)**, 94/369 học viên | Bằng chứng pain mạnh nhất — họ đang làm thủ công đúng cái nhóm định xây |
| Học viên nói rõ chưa hiểu | **8 lượt** trong 1.261 (0,6%) | Signal gap gần như không tồn tại → nhánh mặc định phải là "chưa đủ dữ liệu" |
| Tutor trả lời không citation | 582 (46,2%) | Không được dùng câu trả lời Tutor làm nguồn sự thật |
| `day_code` đối chiếu được | 108 (8,6%) | — |
| **Citation THỰC SỰ kiểm chứng được** | **41 (3,3%)** | **96,7% lượt không xác minh được** |
| Lượt học viên không gõ chữ nào | 355 (28,2%) | Chỉ bôi đen rồi bấm nút |
| Phiên chỉ có 1 lượt hỏi | 292/563 (51,9%) | Sản phẩm phải tạo giá trị từ **một** lượt |

**Chất lượng phép đếm** — đây là phần rubric đòi "phương pháp đếm kiểm lại được":

| Quy tắc | Cách kiểm | Kết quả |
|---|---|---|
| Xin tóm tắt | precision mẫu seed=42 n=30 · recall mẫu phân tầng 120/776 | 96,7% · **87,2%** (KTC95 70,3–95,2%) |
| Nói rõ chưa hiểu | audit tay **100%** | 10 khớp thô → loại 2 → còn 8 |
| Logistics | audit tay **100%** | 9 khớp thô → loại 4 → còn 5 |
| Signal "hỏi lại" | audit tay **100%** trên 29 lượt | precision 86,2% |

Mọi lượt bị loại tay đều có mã + lý do bằng chữ, và có test kiểm rằng lượt bị loại **thực sự từng khớp regex** — chặn việc loại trừ thừa để làm đẹp số.

### 2.3 · Bốn module code

| File | Dòng | Test | Làm gì |
|---|---:|:--:|---|
| `codebase/src/lib/grounding/source-manifest.ts` | 245 | 12 | `resolveSources()` không bao giờ trả mảng rỗng im lặng; `verifyCitation()` |
| `codebase/src/lib/trace/normalize.ts` | 202 | 23 | Tách `studentText` khỏi `question`; lọc theo `learnerId`/`dayCode` |
| `codebase/src/lib/trace/follow-up-signal.ts` | 164 | 17 | B6 — phát hiện signal "hỏi lại" |
| `codebase/src/lib/trace/unassessable.ts` | 148 | 16 | B2 — gom lượt "chưa đủ dữ liệu" |
| `codebase/src/data/learning-trace-fixtures.ts` | 158 | 6 | 3 fixture từ chatlog thật |

Đặt ở `codebase/src/` chứ không phải `src/` như `workflow.md` §4 ghi — vì `tsconfig` map `@/*` → `./src/*` **tương đối với `codebase/`**, và không có `src/` nào ở gốc repo. Đây là nơi duy nhất code biên dịch được (xem Issue #3).

### 2.4 · Ba memo quyết định

| File | Gửi ai | Nội dung |
|---|---|---|
| `research/handoff-data-evidence.md` | cả nhóm | Tôi giao gì cho ai · cần gì từ ai · 6 việc B1–B6 |
| `research/b6-follow-up-signal.md` | Đức | 9 định nghĩa đã đo, chọn R14, precision 86,2%, 3 câu cần trả lời |
| `research/b2-b3-output-shape.md` | Nghĩa + Đại | Dữ liệu quyết định kiểu `unassessableItems` và `relationships` |

### 2.5 · Bốn lỗi tự bắt và sửa

Đây là phần đáng nói nhất khi bị hỏi ở CP5/CP6, vì nó cho thấy quy trình chứ không phải may mắn.

| # | Lỗi | Hậu quả nếu không bắt | Ai bắt |
|---|---|---|---|
| 1 | Đếm trên `content` thô → khớp vào chữ giảng viên trên slide | Thổi phồng "nói rõ chưa hiểu" **6,1 lần** (49 → 8 thật) | audit tay |
| 2 | Chấm "quá ngắn" bỏ qua đoạn bôi đen | Vứt nhầm chủ đề: `T1067` gõ "là gì" nhưng bôi đen "Affinity Mapping" | test fixture |
| 3 | Regex bắt buộc có dấu | Bỏ sót cả nhóm gõ không dấu — **10,8%** lượt có chữ học viên | đo recall |
| 4 | Ngưỡng 272 ký tự đá nhau với luật cắt fixture 250 ký tự | Fixture happy path không sinh nổi signal nào | test |

Lỗi 1 không phải chuyện làm đẹp số: 3,9% nghĩa là "signal đủ thưa", 0,6% nghĩa là "signal gần như không có" — **hai sản phẩm khác nhau**. Và chính LLM Analyzer cũng đọc trường đó, nên normalizer bắt buộc phải tách.

---

## 3. Cách kiểm chứng

```bash
bash research/scripts/run-tests.sh
```

```
── 1/3 · Python: mining evidence          25/25 qua
── 2/3 · TypeScript                       68/68 qua
── 3/3 · Typecheck + lint                 tsc OK · eslint OK
TẤT CẢ ĐỀU QUA
```

Ba tầng test:

1. **Toàn vẹn dữ liệu** — chatlog đúng như `DATA_DICTIONARY` mô tả
2. **Đúng đắn hàm** — tách text, parse citation, phân loại signal
3. **Khoá số liệu** — mọi con số đang trích trong `mining-log.md`; sửa code mà quên cập nhật doc là đỏ

Có **hai test đối chiếu chéo TS↔Python** trên toàn bộ 1.261 lượt (bóc text và detector "hỏi lại"). Cần thiết vì `\b` của JavaScript chỉ hiểu ASCII nên với tiếng Việt có dấu nó sinh ranh giới ngay giữa từ.

---

## 4. Vấn đề còn tồn đọng

### 4.1 · Của riêng tôi — 1 việc

| Việc | Vì sao chưa xong |
|---|---|
| Ghi 3 tên **willing users** vào `canvas.md` (đang là `[BỔ SUNG TÊN]`) | Cần 3 người thật ngoài nhóm đồng ý thử prototype. Không tự điền được. Đây là **tiêu chí nghiệm thu số 5** và điều kiện của **R6 (8đ)**. |

### 4.2 · Đang chờ người khác — 5 việc

| # | Việc | Chờ ai | Không có thì sao |
|---|---|---|---|
| [#3](../../issues/3) | B1 · xác nhận đường dẫn `codebase/src/` | Nghĩa | `workflow.md` §4 vẫn chỉ sai chỗ cho cả 5 người |
| [#5](../../issues/5) | B2 · `unassessableNote: string` → `UnassessableItem[]` | Nghĩa + Đại | Tôi không map fixture sang shape UI được |
| [#6](../../issues/6) | B3 · `Topic.mindmapChild` → `MindmapRelationship[]` | Nghĩa + Đại | như trên |
| [#7](../../issues/7) | B6 · duyệt định nghĩa R14 | Đức | Signal chạy nhưng chưa được phép sinh gap |
| [#2](../../issues/2) | B4 · bàn giao `eval/` + `zpec.md` | Đức | **Đức đã đẩy nhánh `feat/golden-set-eval` xử lý — coi như xong, chờ merge** |

### 4.3 · Không phải việc của tôi nhưng ảnh hưởng cả nhóm

**Quality bar vẫn KHÔNG có trong `spec.md` — trên bất kỳ nhánh nào.**

Tôi kiểm cả 6 nhánh: không nhánh nào có `spec.md` chứa quality bar. Nó vẫn nằm ở `zpec.md`.

`04-rubric.md` phiếu CP4 ghi ô: `☐ quality bar bằng số`, và hạn cứng: *"spec.md commit 23:59 N1, quality bar chốt từ thời điểm này"*. Người chấm mở `spec.md`, không mở `zpec.md`. Đây là **3 điểm R4**, và ảnh hưởng cả cách đọc phần đo lường.

**Lỗi tích hợp: hai người dùng hai nhà cung cấp LLM khác nhau.**

| Nơi | Biến môi trường | Model |
|---|---|---|
| `model.ts` (Nghĩa) | `OPENAI_API_KEY` | `LEARNING_TRACE_MODEL` = `gpt-5-mini` |
| `.env.example` trên `main` | `OPENAI_API_KEY` | như trên |
| `route.ts` (Tuấn Anh) | **`GEMINI_API_KEY`** | `LLM_MODEL_NAME` \|\| `gemini-2.5-flash` |

Route sẽ trả `500 "API key (GEMINI_API_KEY) is not configured"` **kể cả khi mọi thứ khác đã đúng**. Tôi đã gọi API thật và thấy lỗi này.

---

## 5. Vướng mắc — chặn ở đâu

```
[XONG]  research/ evidence A + B          ─┐
[XONG]  source-manifest · normalize        ├─→ PR #1 ─→ chờ review ─→ main
[XONG]  follow-up-signal · unassessable    │
[XONG]  fixtures Day02                    ─┘

[CHỜ]   map fixture sang shape UI    ←── chặn bởi B2 (#5) + B3 (#6)
[CHỜ]   signal sinh possible_gap     ←── chặn bởi B6 (#7)
[CHỜ]   3 willing users              ←── chặn bởi người thật đồng ý
```

**Đường găng của cả nhóm không đi qua tôi.** Phần data đã sẵn sàng nhận việc; chỗ nghẽn nằm ở tích hợp LLM và ở `spec.md`.

---

## 6. Bản đồ file

```
research/                              ← thư mục của tôi (workflow.md §4)
├── STATUS-phohieuanh.md               ← file này
├── survey-log.csv                     34 phiếu (Nghĩa commit lên main)
├── survey-summary.md          145 d   evidence đường A — tôi sửa 3 số + thêm 2 chỉ số
├── mining-log.md              207 d   evidence đường B — 5 phát hiện, 12 quote
├── metrics.json               150 d   máy đọc, pin sha256
├── handoff-data-evidence.md   267 d   bàn giao + 6 việc B1–B6
├── b6-follow-up-signal.md      99 d   memo gửi Đức
├── b2-b3-output-shape.md      128 d   memo gửi Nghĩa + Đại
├── samples/                           GITIGNORE — bản trích audit, tái sinh bằng --samples
└── scripts/
    ├── mine_chatlog.py        632 d   nguồn duy nhất sinh số
    ├── test_mine_chatlog.py   365 d   25 test
    ├── run-tests.sh            46 d   chạy cả 3 tầng
    └── ts/
        ├── normalize.test.ts        368 d   35 test
        ├── follow-up-signal.test.ts 273 d   17 test
        └── unassessable.test.ts     177 d   16 test

codebase/src/                          ← module của tôi
├── lib/grounding/source-manifest.ts   245 d
├── lib/trace/normalize.ts             202 d
├── lib/trace/follow-up-signal.ts      164 d
├── lib/trace/unassessable.ts          148 d
└── data/learning-trace-fixtures.ts    158 d
```

**Vì sao test nằm ở `research/scripts/ts/` chứ không cạnh module:** Node cần đuôi `.ts` trong import specifier, còn `tsconfig` chưa bật `allowImportingTsExtensions` — để test trong `codebase/src/` sẽ làm `npm run build` của cả nhóm đỏ. Không dùng framework test nào để khỏi đụng `package.json` (`workflow.md` §6 quy tắc 4).

---

## 7. Nếu bị hỏi ở CP5/CP6

**"Phần bạn làm là gì?"**
Evidence đường A + B, và tầng dữ liệu: source manifest, normalizer, detector signal, fixture. Chạy `bash research/scripts/run-tests.sh` là thấy hết.

**"Con số này ở đâu ra?"**
`mine_chatlog.py` sinh ra `metrics.json`, doc chỉ trích lại. Chạy trước mặt người hỏi được.

**"Làm sao biết phép đếm đúng?"**
Bucket nhỏ audit tay 100%, bucket lớn audit mẫu có seed cố định. Mọi lượt bị loại có lý do bằng chữ, và có test chặn loại trừ thừa.

**"Có gặp lỗi gì không?"**
Bốn lỗi ở mục 2.5. Lỗi đáng kể nhất: đếm trên `content` thô thổi phồng số liệu 6,1 lần — và đó chính là lý do normalizer phải tách `studentText`.

**"Failure nguy hiểm nhất của sản phẩm?"**
Chỉ 3,3% lượt có citation kiểm chứng được. Nếu hệ thống chép lại số trang của Tutor như thể đã xác minh thì học viên học sai kiến thức mà tưởng có nguồn. `verifyCitation()` chặn đúng chỗ đó.

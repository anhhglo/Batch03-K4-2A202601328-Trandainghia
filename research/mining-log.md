# Mining log — chatlog VLearn Tutor

**Evidence đường B** (guide §1.3): số đếm được · ≥5 ví dụ nguyên văn · phương pháp đếm kiểm lại được.
Bổ sung cho đường A trong `survey-summary.md` (n = 34). B chứng minh pain **tồn tại trong dữ liệu vận hành**; A chứng minh học viên **muốn nó được giải**.

**Owner:** Phó Hiếu Anh · **Chốt:** 2026-07-30 · **Nguồn:** `data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv` (`sha256 400ce4ce5c1c5818…`)

---

## 1. Cách tái lập — không con số nào gõ tay

```bash
python3 research/scripts/mine_chatlog.py --samples   # sinh research/metrics.json + research/samples/
python3 research/scripts/test_mine_chatlog.py        # 25 test, phải xanh hết
```

| Thành phần | Vai trò |
|---|---|
| `research/scripts/mine_chatlog.py` | Nguồn duy nhất sinh ra mọi con số dưới đây |
| `research/metrics.json` | Kết quả máy đọc được, pin theo `sha256` của file CSV |
| `research/scripts/test_mine_chatlog.py` | 25 test: toàn vẹn dữ liệu · đúng đắn hàm tách text · **khoá từng con số đang trích trong file này** |
| `research/samples/*.tsv` | Toàn bộ lượt khớp mỗi quy tắc, để người ngoài nhóm audit phép đếm |

Đổi file CSV → `sha256` đổi → test đỏ. Sửa regex mà quên cập nhật file này → test đỏ. Trích `turn_id` không tồn tại → test đỏ.

## 2. Quy tắc đếm

Tiền xử lý bắt buộc trước mọi phép đếm trên nội dung: **bóc ba lớp** để chỉ còn chữ do chính học viên gõ.

1. Bỏ tiền tố platform `(Trang N, đoạn được chọn: "…")`.
2. Bỏ câu template `Giải thích đoạn bôi đen ở Trang N: "<nội dung slide>"`.
3. Bỏ mọi đoạn còn lại trong ngoặc kép (nội dung học liệu dán vào).

Bước này không phải chi tiết kỹ thuật — **bỏ qua nó thì mọi con số đều sai**. Xem mục 6.

| Nhãn | Quy tắc | Cách audit |
|---|---|---|
| Xin tóm tắt/ôn tập | khớp `tóm tắt · tóm lược · tổng hợp · tổng kết · ý chính · nội dung chính · ôn tập · ôn lại · điểm quan trọng`, **có dấu và không dấu** | precision: mẫu seed=42 n=30 → **96,7%**<br>recall: mẫu phân tầng 120/776 → **87,2%** (KTC95 70,3–95,2%) |
| Nói rõ chưa hiểu | khớp `chưa/không hiểu · chưa rõ · khó hiểu · giải thích lại · mơ hồ` | **audit tay 100%**: 10 khớp thô → loại 2 → còn 8 |
| Logistics | khớp `deadline · nộp bài · tải xuống · download · link · đăng ký · lịch học` | **audit tay 100%**: 9 khớp thô → loại 4 → còn 5 |
| Câu hỏi template | khớp chuỗi cố định `Giải thích đoạn bôi đen ở Trang N` | không cần audit |
| Không có căn cứ | trường `citations` rỗng | không cần audit |
| Phiên | một phiên = `(user_id, day_code)` — đúng cách sản phẩm lọc dữ liệu theo buổi | không cần audit |

Mọi lượt bị loại tay đều có mã và **lý do bằng chữ** trong `MANUAL_EXCLUSIONS` (`mine_chatlog.py`), và có test bắt buộc lý do không được sơ sài, đồng thời kiểm rằng lượt bị loại thực sự từng khớp regex — tránh loại trừ thừa để làm đẹp số.

## 3. Quy mô

| | |
|---|---|
| Lượt hỏi–đáp | **1.261** |
| Học viên | **369** |
| Hội thoại | 585 |
| Khoảng thời gian | 22/07 → 29/07/2026 |
| Số `day_code` khác nhau | 21 |

## 4. Bốn phát hiện

### 4.1 · Học viên đang tự làm thủ công đúng công việc của Learning Trace

**134/1.261 lượt (10,6%), từ 94/369 học viên (25,5%)** là yêu cầu tóm tắt hoặc hệ thống hoá lại nội dung để ôn.

Đây là bằng chứng pain mạnh nhất trong data pack: không cần hỏi ai, cứ 10 lượt hỏi Tutor thì có 1 lượt học viên đang **tự tay yêu cầu chính output mà nhóm định xây**. Một phần tư số học viên đã làm việc này ít nhất một lần trong 6 ngày.

Đối chiếu đường A: 22/30 người (73,3%) nói tốn ≥11 phút hoặc bỏ luôn việc ôn. Hai đường độc lập chỉ về cùng một chỗ.

### 4.2 · Signal để kết luận "chưa vững" thưa đến mức phải thiết kế quanh nó

| Signal | Số lượt | Tỷ lệ |
|---|---:|---:|
| Học viên **nói rõ** chưa hiểu | **8** | 0,6% |
| Hỏi lại cùng nội dung sau khi đã được giải thích | **29** | 2,3% |
| Tutor chủ động kiểm tra hiểu bài (`asked_check_question`) | 3 | 0,2% |
| Có rating | 70 | 5,6% |
| Trường `misconceptions` từng được dùng | **0** | 0% |
| Trường `follow_ups` từng được dùng | **0** | 0% |

Chỉ **8 lượt trong toàn bộ 1.261** có học viên nói thẳng là chưa hiểu. Spec §4 chỉ cho phép ba loại signal sinh `possible_gap`, trong đó "nói rõ chưa hiểu" là loại đếm được chắc chắn nhất — và nó gần như không tồn tại.

Signal "hỏi lại" đã được định nghĩa và đo riêng: quy tắc thô "hai lượt cùng một trang" gắn cờ 318 lượt (25,2%) và lẫn đầy rác, còn quy tắc chặt cho **29 lượt (2,3%)** với precision 86,2% theo audit tay 100%. Chi tiết và ba câu cần Nguyễn Xuân Đức chốt: `b6-follow-up-signal.md`.

**Hệ quả thiết kế:** nhánh mặc định của sản phẩm phải là "đã tìm hiểu" và "chưa đủ dữ liệu", không phải "có khả năng chưa vững". Hai trường `misconceptions` và `follow_ups` rỗng 100% xác nhận VLearn hiện chưa hề lưu kết quả phân tích lỗ hổng có cấu trúc — tức Learning Trace không trùng lặp với thứ đã có.

### 4.3 · Phần lớn nội dung không đối chiếu được với nguồn chính thức

| | Số lượt | Tỷ lệ |
|---|---:|---:|
| Tutor trả lời **không có citation** | 582 | **46,2%** |
| `day_code` gọi tên Day 1/Day 2 — đối chiếu được với slide trong pack | 108 | **8,6%** |
| `day_code` là placeholder `New learning material` | 397 | 31,5% |

Trang được Tutor trích dẫn lớn nhất là **96**, trong khi hai bộ slide trong data pack chỉ có 29 trang/bộ — chứng minh phần lớn `day_code` trỏ tới tài liệu **không nằm trong pack**.

**Hệ quả thiết kế:** với ~91% dữ liệu, hệ thống **không thể** kiểm chứng citation. Nhánh "thiếu nguồn → không sinh giải thích, ghi rõ giới hạn" không phải trường hợp ngoại lệ mà là **đường đi chính**. Câu trả lời của Tutor tuyệt đối không được dùng làm nguồn sự thật.

### 4.4 · Hơn một phần tư câu hỏi không do học viên viết

| | Số lượt | Tỷ lệ |
|---|---:|---:|
| Có bôi đen đoạn tài liệu | 1.252 | 99,3% |
| Là câu template do platform sinh | 357 | **28,3%** |
| Sau khi bóc hết nội dung slide, **không còn chữ nào của học viên** | 355 | **28,2%** |
| Độ dài trung vị phần chữ học viên tự gõ | | **19 ký tự** |

Hơn 1/4 lượt là học viên bôi đen rồi bấm nút, không diễn đạt gì. Những lượt này cho biết học viên **đã xem** đoạn nào, nhưng không mang thông tin về mức độ hiểu.

### 4.5 · Phiên rất mỏng

| | |
|---|---|
| Số phiên `(user_id, day_code)` | 563 |
| Số lượt trung vị mỗi phiên | **1** |
| Phiên chỉ có đúng 1 lượt | **292 (51,9%)** |
| Phiên có ≤2 lượt | **419 (74,4%)** |
| Phiên có ≥5 lượt | 50 |
| Phiên dày nhất | 30 lượt |

Hơn nửa số phiên chỉ có một lượt hỏi. Learning Trace phải tạo ra giá trị đọc được từ **một** lượt hỏi, hoặc phải mở rộng phạm vi ra nhiều buổi. 50 phiên ≥5 lượt là nguồn case demo duy nhất cho happy path.

## 5. Ví dụ nguyên văn

Trích ngắn theo quy định bảo mật data pack — mã lượt để kiểm lại, không dán nguyên văn dài.

**Học viên tự yêu cầu đúng output của Learning Trace:**

> "tóm tắt cho tôi buổi học hôm nay - buổi đầu tiên" — `T0716`

> "hãy tóm tắt lại những ý chính trong tài liệu học tập của ngày hôm nay" — `T1120`

> "tóm tắt tất cả nội dung cần note lại đầy đủ" — `T0938`

> "Tôi cần tóm tắt những nội dung cần học" — `T0176`

> "tóm tắt cho t tất cả từ trang 1 đến trang 44 bài này học về gì" — `T1164`

> "TẠO QUIZ ĐỂ TÔI HIỂU RÕ VÀ ÔN LẠI TOÀN BỘ SLIDE NÀY" — `T0849`

**Toàn bộ 8 lượt học viên nói rõ chưa hiểu** (đây là 100% signal gap chắc chắn có trong 1.261 lượt):

> "slide số 18: sự khác nhau giữa ML và DL chưa rõ lắm" — `T0902`

> "là sao fen tôi chưa hiểu lắm, định nghĩa lại feature extraction giúp tôi" — `T0525`

> "Tôi chưa hiểu tại sao, giải thích kỹ hơn" — `T0500`

> "TÔI KHÔNG HIỂU TRANG 6" — `T0941`

> "không hiểu gì" — `T1220`

Ba lượt còn lại: `T0089`, `T0638`, `T1100`.

**Bẫy ngôn ngữ đã loại bằng audit tay:**

> "…trả lời cho một sinh viên SE chưa hiểu gì về AI" — `T0597`

Cụm "chưa hiểu" mô tả một người giả định, không phải chính học viên. Nếu đếm máy không audit, lượt này sẽ bị gán nhãn lỗ hổng kiến thức sai.

## 6. Một lỗi phương pháp đã bắt được và cách xử lý

Lượt đếm đầu tiên chạy regex trên nguyên nội dung tin nhắn và cho ra: 49 lượt "chưa hiểu" (3,9%) và 12 lượt logistics.

Audit tay phát hiện **phần lớn là dương tính giả** — regex khớp vào **chữ của giảng viên trên slide** mà học viên bôi đen hoặc dán vào, không phải lời học viên. Ví dụ 7/12 lượt "logistics" thực ra khớp cụm *"chatbot hỗ trợ sinh viên VinUni đăng ký môn học"* nằm trong **đề bài tập viết prompt trên slide**.

Sau khi thêm bước bóc ba lớp và audit tay 100%: **8 lượt** chưa hiểu (0,6%), **5 lượt** logistics.

| | Lượt đếm 1 | Sau khi sửa | Chênh |
|---|---:|---:|---|
| Nói rõ chưa hiểu | 49 (3,9%) | **8 (0,6%)** | thổi phồng **6,1×** |
| Logistics | 12 | **5** | thổi phồng 2,4× |

Ghi lại vì hai lý do: (1) kết luận thiết kế ở 4.2 phụ thuộc hoàn toàn vào con số đúng — 3,9% thì signal "đủ thưa"; 0,6% thì signal "gần như không có", và đó là hai sản phẩm khác nhau; (2) chính LLM Analyzer cũng sẽ đọc trường `question` này, nên **normalizer bắt buộc phải tách `student_text` khỏi nội dung slide**, nếu không model sẽ mắc đúng lỗi mà phép đếm vừa mắc.

Một con số khác cũng đã sửa: `day_code` đối chiếu được là **8,6% (108 lượt)**, không phải 7,2% như bản nháp §7 ghi — regex cũ bỏ sót `day_code` có dấu cách (`Day 1`, `Day 2`). Xem `handoff-data-evidence.md` mục bàn giao cho Nguyễn Xuân Đức.

## 6b. Đo recall cho quy tắc "xin tóm tắt"

Precision trả lời "cái đã đếm có đúng không". Recall trả lời "còn sót bao nhiêu" — và nó chỉ đo được bằng cách lấy mẫu từ phía **không khớp**.

**Cách làm — phân tầng:**

| Tầng | Cỡ | Xử lý |
|---|---:|---|
| A · lượt không có chữ học viên nào | 355 | Loại **theo định nghĩa**: quy tắc đọc `student_text`, học viên không gõ gì thì không thể là yêu cầu tóm tắt. Không cần lấy mẫu. |
| B · lượt có chữ học viên | 776 | Lấy mẫu **120** (seed 2026 và 777), audit tay từng lượt |

**Kết quả:** 4/120 lượt trong tầng B là dương tính bị bỏ sót.

| Lượt sót | Chữ học viên | Vì sao sót |
|---|---|---|
| `T0737` | *"Neu ba y chinh cua slide…"* | **viết không dấu** — quy tắc cũ bắt buộc có dấu |
| `T1253` | *"Toàn bộ slide này trình bày về nội dung gì?"* | ngữ nghĩa: hỏi tổng quan mà không dùng từ khoá |
| `T0591` | *"nêu những kiến thức cần học một cách chi tiết…"* | ngữ nghĩa |
| `T1149` | *"nội dung bài học day 2"* | ngữ nghĩa |

**Một lỗ hổng hệ thống lộ ra:** **88/812 lượt có chữ học viên (10,8%) được gõ hoàn toàn không dấu.** Quy tắc cũ bắt buộc có dấu nên bỏ sót toàn bộ nhóm này. Đã thêm biến thể không dấu → bắt thêm **4 lượt** (`T0224`, `T0737`, `T0879`, `T1184`), tất cả đều là yêu cầu tóm tắt thật, tức phần thêm có **precision 100%**.

**Recall sau khi sửa: ước lượng 87,2%** (KTC 95%: 70,3–95,2%).

Khoảng tin cậy rộng vì mẫu tầng B mới có 120/776. Ba lượt còn sót đều là **ngữ nghĩa chứ không phải chính tả** — học viên hỏi "nội dung … là gì" mà không dùng từ khoá nào. Bắt được nhóm này cần phân loại ý định chứ không phải thêm từ khoá, nằm ngoài phạm vi lát cắt hiện tại.

## 7. Giới hạn

- Dữ liệu chỉ 6 ngày (22–29/07/2026), không phủ hết một khoá.
- "Hỏi lại cùng trang" (206) là cận trên thô, chưa phải signal đã xác thực.
- Quy tắc đếm dựa trên tiếng Việt có dấu; lượt viết không dấu hoặc tiếng Anh có thể bị bỏ sót — riêng bucket logistics đã thấy một lượt tiếng Anh (`T0752`) và nó vẫn được bắt nhờ từ khoá `download`.
- Recall của quy tắc tóm tắt ước lượng **87,2%** nhưng khoảng tin cậy rộng (70,3–95,2%) vì chỉ lấy mẫu 120/776. Muốn siết lại thì phải mở rộng mẫu.
- Số liệu mô tả hành vi **trong** VLearn. Việc học viên bỏ sang ChatGPT (7/34 phiếu ở đường A) không để lại dấu vết nào trong chatlog — mining một mình không thấy được phần này.

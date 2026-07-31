# Câu hỏi phản biện & trả lời — VLearn Learning Trace

Chuẩn bị cho Q&A demo (CP6). Câu hỏi được rút từ chính dữ liệu và trạng thái
thật của repo (`spec.md`, `research/`, `eval/`, `codebase/`) tính đến
2026-07-31, không phải câu hỏi dàn dựng. Một số câu chưa có câu trả lời "đẹp"
— phần đó được ghi thẳng là **chưa xử lý xong**, vì giám khảo hỏi trúng chỗ
này gần như chắc chắn.

---

## G. Business logic

### G1. "Conditional automation" nghe hợp lý trên giấy — nhưng ranh giới automation thực tế có nhất quán không? `topics` (đã tìm hiểu) được sinh gần như tự động mỗi khi có ≥1 nguồn, còn `reviewItems` (cần xem lại) bị siết bởi 3 loại signal hẹp. Vậy sản phẩm có đang "tự động 100%" ở nhánh ít rủi ro và "tự động 0%, toàn hỏi lại học viên" ở nhánh rủi ro cao — tức không phải một chính sách automation, mà là hai chính sách khác nhau dán chung một cái tên?

**Trả lời:** Đúng là hai mức độ khác nhau, và đó là chủ đích chứ không phải
thiếu nhất quán — logic dựa thẳng vào cost-of-error (`spec.md` §4, "Mức tự
động hóa"). Sinh sai một `topic` ("bạn đã tìm hiểu X") chi phí thấp: nhầm thì
học viên chỉ thấy một mục thừa vô hại. Sinh sai một `reviewItem` ("bạn có thể
chưa vững Y") chi phí cao: học viên có thể ôn sai trọng tâm hoặc mất niềm
tin vào hệ thống. Vì hai loại lỗi có chi phí khác nhau, chính sách automation
khác nhau theo thiết kế là hợp lý — miễn là được nói rõ ra như hai chính sách
tách biệt khi trình bày, không gộp chung thành một câu "hệ thống dùng
conditional automation" mập mờ.

### G2. Khảo sát cho thấy 10/34 (29,4%) muốn "câu hỏi tự kiểm tra" (quiz) — một tỷ lệ không nhỏ. Loại quiz khỏi scope có phải bỏ lỡ nhu cầu thật, chỉ vì nó khó làm trong thời gian hackathon?

**Trả lời:** Có bỏ lỡ nhu cầu thật, nhóm không phủ nhận điều đó — quiz nằm
trong bảng impact (`survey-summary.md` §5) với ghi chú rõ "có giá trị nhưng
cần thiết kế câu hỏi, chấm và tiêu chí đánh giá". Lý do loại không phải "khó
làm kịp" đơn thuần, mà là **xung đột trực tiếp với non-goal cốt lõi**: quiz
ngụ ý chấm/đánh giá đúng-sai, trong khi cả sản phẩm được thiết kế quanh
nguyên tắc "không chấm điểm, không kết luận năng lực" (`spec.md` "Non-goals").
Nhét quiz vào sẽ phá vỡ chính ranh giới mà GS-12 (case golden set) buộc hệ
thống phải giữ. Đây là đánh đổi phạm vi có chủ đích, không phải năng lực kỹ
thuật thiếu.

### G3. Đơn vị xử lý là một `(learnerId, dayCode, conversationId)` — một buổi, một hội thoại. Nếu một học viên có nhiều hội thoại rời rạc trong cùng một buổi (mở lại Tutor nhiều lần), business logic hiện tại có gộp được không, hay mỗi lần chạy chỉ thấy một mảnh?

**Trả lời:** Theo contract hiện tại (`spec.md` §4, "Dữ liệu đầu vào"), mỗi
lần gọi bị giới hạn đúng một `conversation_id` — đây là giới hạn có chủ đích
để tránh trộn lẫn ngữ cảnh giữa các hội thoại không liên quan (nguyên tắc
"không kết luận vượt bằng chứng"). Hệ quả thật: nếu học viên có 3 hội thoại
rời rạc trong một buổi, sản phẩm hiện tại cần 3 lần gọi + hợp nhất kết quả ở
tầng UI/API — việc hợp nhất nhiều `LearningTraceAnalysis` của cùng một
`dayCode` thành một view duy nhất **chưa được thiết kế**, đây là khoảng
trống thật trong business logic nếu hành vi thật của học viên là mở nhiều
hội thoại thay vì một hội thoại dài.

### G4. Sản phẩm loại "bản đồ lỗ hổng cấp lớp cho giảng viên" khỏi scope CP2 vì "mở rộng actor, quyền truy cập và privacy" (`survey-summary.md` §5). Nhưng nếu sau này khoá muốn làm tính năng đó, kiến trúc hiện tại (mỗi request đúng 1 học viên) có tái dùng được, hay phải thiết kế lại từ đầu?

**Trả lời:** Tái dùng được ở tầng phân tích từng buổi (`analyzeLearningTrace`
vẫn chạy per-learner-per-day như cũ), nhưng **không** tái dùng được ở tầng
tổng hợp/hiển thị: toàn bộ pipeline hiện tại (contract, adapter, UI) giả
định người xem output chính là chủ nhân dữ liệu (`spec.md`: "chỉ dùng dữ liệu
của chính học viên đang xem"). Muốn có view cấp lớp cho giảng viên cần thêm
tối thiểu ba thứ chưa tồn tại: (1) một tầng tổng hợp nhiều `LearningTraceAnalysis`
thành thống kê lớp, (2) một mô hình quyền truy cập khác (giảng viên xem được
dữ liệu người khác — điều guardrail hiện tại **chủ động chặn**, xem GS-13),
(3) chính sách ẩn danh/tổng hợp để không lộ từng cá nhân. Đây là lý do nhóm
xếp việc này vào "loại khỏi CP2" chứ không phải "làm sau" — nó đụng thẳng vào
một ràng buộc bảo mật đang được code cứng vào guardrail (GS-13: từ chối xem
trace người khác), chứ không đơn thuần là thêm tính năng.

### G5. `confidence` trong `reviewItems` chỉ có hai mức `"medium" | "low"`, không có `"high"`. Về mặt UX, học viên có thể hiểu nhầm là "hệ thống lúc nào cũng không chắc chắn" và ngừng tin cả những gợi ý đúng — business logic của việc bỏ hẳn mức "high" là gì?

**Trả lời:** Đây là quyết định có chủ đích, không phải thiếu sót
(`spec.md` §4: "`reviewItems` chỉ dùng `confidence` là `low` hoặc `medium`;
đây là gợi ý cần xác nhận, không phải chẩn đoán năng lực"). Lý do: signal
hành vi cho phép sinh `reviewItem` (nói rõ chưa hiểu / hỏi lại / phản biện
chưa giải quyết) tự bản chất chỉ là **dấu hiệu gián tiếp**, không bao giờ là
bằng chứng chắc chắn học viên chưa vững — kể cả khi học viên nói thẳng "tôi
chưa hiểu X", hệ thống vẫn không biết chắc họ đã tự hiểu ra sau đó hay chưa.
Gắn nhãn "high confidence" sẽ ngầm biến gợi ý thành kết luận, đúng thứ nguyên
tắc G10 (`spec.md` §4b) cấm. Đánh đổi UX (có thể gây mệt mỏi vì lúc nào cũng
thấy "cần xác nhận") được chấp nhận để đổi lấy việc không bao giờ tuyên bố
chắc chắn về một thứ vốn dĩ không chắc chắn.

---

## H. Kỹ thuật

### H1. Route `POST /api/learning-trace` gọi model đồng bộ, timeout cấu hình cứng `LEARNING_TRACE_TIMEOUT_MS=30000` bất kể input to hay nhỏ. Một phiên 30 lượt (như `GS-23`, `U0106`) chắc chắn cần nhiều token xử lý hơn một phiên 1 lượt — timeout cố định có công bằng giữa hai loại input này không?

**Trả lời:** Đây là giới hạn thật của bản hiện tại — timeout là một hằng số
môi trường (`.env.example`), không scale theo kích thước input. Với phiên
dày (`GS-23`), rủi ro timeout cao hơn thật sự, và `core-llm-api-smoke-run-01.md`
đã ghi nhận một lần `504` xảy ra ngay cả với input bình thường. Hướng giảm
thiểu hiện có là ở tầng UX chứ không phải tầng timeout: route không tự retry
vô hạn, UI có trạng thái `error` với nút thử lại tường minh — chấp nhận có
thể phải bấm lại thay vì cố che giấu độ trễ bằng cách kéo dài timeout vô
hạn (rủi ro treo UI lâu hơn). Scale timeout theo `interactions.length` là
cải tiến hợp lý chưa được làm.

### H2. Schema ép OpenAI trả JSON từng bị từ chối với lỗi `invalid_json_schema` (không nhận `uniqueItems`, không cho annotation cạnh `$ref`, cần `type` cạnh `const`) và được vá bằng "provider-schema adapter" riêng trong `model.ts` (`core-llm-smoke-run-01.md`, mục "Known failures"). Ai đảm bảo adapter này không lệch khỏi canonical schema khi contract đổi về sau — có test kiểm tra hai bên đồng bộ không, hay dựa vào con người nhớ sửa cả hai chỗ?

**Trả lời:** Theo ghi nhận trong `core-llm-smoke-run-01.md`: "canonical schema
không đổi và uniqueness vẫn được hậu kiểm ở analyzer" — nghĩa là ràng buộc
`uniqueItems` mà provider-schema không hỗ trợ được **bù lại bằng một bước
hậu kiểm thủ công trong code** (`analyze-learning-trace.ts`), không phải bị
bỏ qua. Đây giảm rủi ro "adapter lệch khỏi ý định canonical" cho riêng ràng
buộc đó. Nhưng câu hỏi rộng hơn — có test tự động đảm bảo *mọi* thay đổi
tương lai ở canonical schema đều được phản ánh đúng ở provider-schema adapter,
hay phụ thuộc vào người sửa nhớ sửa cả hai nơi — **chưa có câu trả lời xác
nhận qua test**, đây là rủi ro bảo trì thật cần bổ sung một test đối chiếu
hai schema.

### H3. Không có database — toàn bộ `trace`/`statuses` (xác nhận "Mình đã hiểu"/"Cần xem lại" của học viên) chỉ sống trong React state phía client. Refresh trang là mất sạch, kể cả phần học viên vừa xác nhận. Đây có phải giới hạn chấp nhận được cho một prototype hackathon, hay là một khiếm khuyết sẽ lộ ngay khi giám khảo lỡ tay F5?

**Trả lời:** Chấp nhận được cho *mức độ prototype đã khai báo* — `spec.md`
và rubric R5 chỉ yêu cầu "chạy end-to-end theo lát cắt đã khai", không yêu
cầu persistence qua session. Nhưng đây là rủi ro demo thật cần né chủ động:
nếu giám khảo vô tình F5 giữa lúc đang xem kết quả đã xác nhận, toàn bộ
trạng thái (`statuses`, `trace` đã phân tích) mất và app quay về màn hình
`preview` ban đầu — không có thông báo nào giải thích vì sao. Nên chuẩn bị
trước: hoặc nói rõ giới hạn này khi demo, hoặc né thao tác refresh, không
nên để giám khảo tự khám phá ra.

### H4. Citation guardrail hiện tại kiểm tra `sourceId` có nằm trong allowlist không (theo `verifyCitation()`/schema validation) — đây là kiểm tra **định danh**, không phải kiểm tra **ngữ nghĩa**. Nếu model chọn đúng `sourceId` hợp lệ nhưng viết `summary`/`reason` không thực sự khớp nội dung excerpt của nguồn đó (hallucinate nội dung nhưng gắn đúng ID), guardrail hiện tại có bắt được không?

**Trả lời:** Không, và đây là giới hạn được ghi nhận thẳng, không phải chỗ
hở bị giấu: `core-llm-smoke-run-01.md` mục "Known failures" nói rõ "Nội dung
đúng ngữ nghĩa của citation mới được kiểm ở mức fixture đã chọn. Citation
guardrail hiện đảm bảo ID thuộc allowlist, **chưa tự chứng minh mọi claim
trong output được source excerpt hỗ trợ**." Lớp phòng thủ ngữ nghĩa duy nhất
hiện tại là chấm tay theo D3 trong golden set (người chấm mở đúng trang/mã
đoạn, đọc xem nội dung có thực sự nói về khái niệm hay không) — chưa có
guardrail tự động nào làm việc này lúc runtime. Đây là khoảng trống kỹ thuật
thật giữa "citation tồn tại" và "citation đúng nội dung".

### H5. `sourceId` (wire format gửi API, theo `LearningTraceInput`) và `id` (field trong `SourceReference` nội bộ UI, `types/learning-trace.ts`) từng là hai tên khác nhau cho cùng một khái niệm — đã raise ở bản adapter trước. Bản hiện tại đã thống nhất chưa, hay vẫn phải convert qua lại ở đâu đó mà không ai để ý?

**Trả lời:** Hiện adapter (`learning-trace-adapter.ts` bản mới nhất, do Trần
Đại Nghĩa cập nhật) import type `LearningTraceInput`/`LearningTraceAnalysis`
trực tiếp từ `@/lib/llm/learning-trace-contract` làm nguồn chân lý duy nhất
cho wire format — không tự định nghĩa lại `sources` bằng `SourceReference`
nội bộ nữa. Điểm cần xác nhận thêm (chưa tự kiểm chứng lại trong lần đọc
này): `DemoDataLab.tsx` cho phép nhập tay `sourceId`, còn các chỗ hiển thị
khác trong UI (`EvidenceModal`, `ContextSidebar`) có còn nơi nào tham chiếu
field `id` kiểu cũ hay không — nên grep lại `SourceReference` trước khi
khẳng định 100% đã hết chỗ lệch tên.

### H6. `runtime = "nodejs"` được khai báo tường minh trong `route.ts` thay vì Edge runtime — lý do kỹ thuật là gì, và có đánh đổi latency nào khi demo (cold start) không?

**Trả lời:** Việc chọn Node runtime thay vì Edge thuộc quyết định của
Trần Tuấn Anh (Backend & Integration Owner); lý do hợp lý nhất kỹ thuật ở
đây là gọi OpenAI SDK qua Responses API và cần các API Node đầy đủ (timeout
control, xử lý lỗi provider chi tiết) mà Edge runtime giới hạn hơn. Đánh đổi
thật: Node runtime trên một số nền tảng deploy có cold start cao hơn Edge —
nhưng vì prototype chạy `next dev`/local demo (không deploy serverless edge
thật), ảnh hưởng này không xuất hiện trong bối cảnh demo hiện tại. Nếu sau
này deploy lên môi trường serverless có cold start, đây là chỗ cần đo lại.

---

## I. Câu hỏi kết hợp số liệu (liên file, không có sẵn trong một bảng nào)

Các câu này đòi hỏi ghép số liệu từ ≥2 file khác nhau — không ai viết sẵn kết
luận này ra, phải tự tính.

### I1. `mining-log.md` nói 108/1.261 lượt (8,6%) có `day_code` đối chiếu được với slide trong pack. Nhưng `handoff-data-evidence.md` (mục 2.3, từ `verifyCitation()`) nói chỉ 41/1.261 lượt (3,3%) có citation **thực sự kiểm chứng được** đúng nội dung. Vậy ngay trong 8,6% dữ liệu "map được", tỷ lệ citation còn *sống sót* qua kiểm tra nội dung là bao nhiêu?

**Trả lời:** 41/108 ≈ **38%**. Nghĩa là ngay cả trong nhóm dữ liệu đã được
coi là "tốt" (map được sang đúng bộ slide), gần **2/3 số lượt** vẫn không có
citation đối chiếu đúng nội dung khi kiểm tay — có thể vì Tutor cite sai
trang trong đúng bộ slide, hoặc trang đúng nhưng nội dung không thực sự nói
về khái niệm được hỏi (đúng dạng lỗi mà case `GS-02` mô phỏng). Đây là con số
đáng nói khi demo hơn cả 8,6% hay 3,3% đứng riêng: **"map được `day_code`"
không đồng nghĩa với "citation dùng được"** — khoảng cách giữa hai con số
chính là lý do nhánh `unassessable_items` phải là đường đi chính, không phải
ngoại lệ.

### I2. Khảo sát (`survey-summary.md`) cho thấy Mindmap là thành phần được **14/34 người (41,2%)** chọn muốn thấy. Nhưng `handoff-data-evidence.md` (mục B3) ghi rõ: **98,4% phiên không vẽ nổi cạnh (edge) nào có căn cứ**. Kết hợp hai con số này: tính năng được gần một nửa người khảo sát yêu cầu, khi chạy trên dữ liệu thật, sẽ hiển thị gì cho phần lớn học viên?

**Trả lời:** Với 98,4% phiên, Personalized Mindmap thực tế sẽ hiển thị **node
rời rạc không có cạnh nối** (mỗi chủ đề đứng một mình, không có `relationship`
nào đủ căn cứ để vẽ quan hệ) — không phải bản đồ liên kết như tên gọi hay
như học viên hình dung khi trả lời khảo sát. Đây không phải lỗi hiển thị, mà
là hệ quả trung thực của nguyên tắc "quan hệ chỉ được tạo khi có nguồn chính
thức hỗ trợ chính quan hệ đó, không chỉ hỗ trợ hai khái niệm" (`spec.md` §4).
Fixture Day02 dùng để demo (`day02-c301`, `U0323`) được chọn **có chủ đích**
vì nó thuộc số ít phiên có đủ nguồn để vẽ được quan hệ thật — nên bản demo
sẽ trông tốt hơn đáng kể so với trải nghiệm trung vị của một học viên thật.
Đây là khoảng cách cần nói rõ khi trình bày, không nên để giám khảo tự suy ra
và cho rằng nhóm đang phóng đại khả năng thật của mindmap.

### I3. Quy tắc "hỏi lại cùng nội dung" thô (2 lượt cùng trang trong phiên) gắn cờ 318/1.261 lượt (25,2%). Sau khi lọc chặt theo định nghĩa R14 (`b6-follow-up-signal.md`), chỉ còn 29 lượt (2,3%), precision 86,2% (audit tay 25/29 đúng). Golden set chỉ dùng con số 29 lượt này làm nền cho vài case (`GS-21` là ví dụ happy path). Mẫu 29 lượt (từ audit tay 100%, không phải mẫu ngẫu nhiên) có đủ lớn để tin rule R14 sẽ generalize đúng cho những lượt "hỏi lại" mới chưa từng thấy, hay đây vẫn là một quy tắc rule-based dễ vỡ khi gặp cách diễn đạt khác?

**Trả lời:** 29 lượt đã được audit tay **100%** (không phải lấy mẫu suy rộng
như phép đo recall của rule "xin tóm tắt"), nên precision 86,2% là số đo
trực tiếp trên toàn bộ tập đó, đáng tin cho *đúng tập dữ liệu 6 ngày này*.
Nhưng R14 vẫn là **rule dựa trên cùng trang trong cùng phiên** — một quy tắc
cấu trúc (structural), không phải hiểu ngôn ngữ. Nó chắc chắn sẽ bỏ sót
trường hợp học viên hỏi lại cùng một khái niệm nhưng chuyển sang trang khác,
hoặc diễn đạt lại bằng từ hoàn toàn khác — giống hệt cách rule "xin tóm tắt"
từng bỏ sót các câu hỏi ngữ nghĩa không dùng từ khoá (`mining-log.md` §6b:
"3 lượt còn sót đều là ngữ nghĩa chứ không phải chính tả"). Đây là lý do
`handoff-data-evidence.md` khuyến nghị R14 **không tự động thành
`possible_gap`** mà bắt buộc `confidence: "low"` + học viên tự xác nhận —
tức nhóm đã tự nhận rule có thể vỡ và thiết kế một lớp xác nhận người dùng
để chặn hậu quả, thay vì tin tuyệt đối vào rule.

### I4. Rating chỉ xuất hiện ở 70/1.261 lượt (5,6%, theo `mining-log.md` §4.2), và bản thân rating `down` đã bị cấm dùng làm signal gap (D2, case đối chứng `GS-24`). Nếu bỏ hẳn rating ra khỏi mọi quyết định phân loại — tại sao trường này vẫn được thu thập/truyền vào input contract (`interactions[].rating` xuất hiện trong `LearningTraceInput`)? Đây có phải dữ liệu thừa, tăng bề mặt input không cần thiết?

**Trả lời:** Không thừa hoàn toàn — rating vẫn có giá trị **loại trừ**, dù
không có giá trị **sinh ra kết luận**. Việc giữ trường này trong input cho
phép guardrail/quy tắc D2 **chủ động kiểm tra và từ chối** trường hợp ai đó
(người viết prompt sau này, hoặc một phiên bản model khác) vô tình dùng
`rating = down` làm bằng chứng — nếu bỏ hẳn trường ra khỏi input, sẽ không
còn cách nào kiểm chứng được rằng hệ thống *đã thấy* rating và *chủ động
không dùng* nó, so với việc *không hề biết* rating tồn tại. Golden set case
`GS-24` chỉ kiểm chứng được hành vi đúng ("không tạo gap từ rating down")
*vì* trường này có mặt trong input. Giữ trường thừa nhưng vô hiệu hoá có chủ
đích là một dạng "test được cả điều không nên làm", không phải sơ suất thiết
kế.

---

## Tổng kết — 3 điểm hở lớn nhất nếu bị hỏi dồn

1. **Golden set 24 case chưa chạy chính thức** (chỉ có smoke 5 case) — do
   `eval/golden-set.jsonl` còn nhãn cũ chưa map. *(mục C1)*
2. **`EvidenceModal` chưa phản ánh đúng trạng thái nguồn** — badge "Nguồn đã
   cấp" hiện cứng cho mọi trường hợp, kể cả case unassessable. *(mục D1)*
3. **Chưa có xác nhận UI bằng thao tác chuột thật**, chỉ có xác nhận ở tầng
   build/API. *(mục D2)*

Cả ba đều có chủ sở hữu rõ ràng và đường xử lý đã biết — nên trả lời bằng
"đây là việc đang treo, đây là ai phụ trách, đây là vì sao chưa xong" thay vì
né tránh câu hỏi.

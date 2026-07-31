# 📊 Báo cáo Tổng hợp Số liệu & Kết quả Kiểm thử (Report)

**Dự án:** VLearn Learning Trace (Note & Mindmap cá nhân hóa)  
**Người lập báo cáo:** Nguyễn Xuân Đức (AI Evaluation Owner)  
**Ngày cập nhật:** 2026-07-31  

---

## 🎯 Ý nghĩa của việc Đối chiếu & Kiểm thử Số liệu (Why - What - How)

### 1. Việc đối chiếu và kiểm thử số liệu để làm gì? (Why)
*   **Đảm bảo tính nhất quán (Consistency):** Giúp toàn bộ nhóm phát triển đi đúng hướng, thống nhất một ngôn ngữ chung từ các giả định ban đầu (trong `spec.md`) cho đến sản phẩm thực tế chạy được. Tránh việc tài liệu viết một kiểu nhưng code chạy và kết quả chấm thi lại ra một kiểu khác.
*   **Ngăn chặn sự bịa đặt của mô hình AI (Anti-hallucination):** Việc liên tục kiểm thử các ràng buộc nguồn học liệu chính thức (`sourceIds`) và bằng chứng hội thoại (`evidenceTurnIds`) giúp khóa chặt hành vi của mô hình AI, không cho phép AI tự biên tự diễn hay suy diễn quá đà vượt quá nguồn dữ liệu cung cấp.

### 2. Phục vụ vấn đề gì? (What problem it serves)
*   **Quản lý chất lượng & Rủi ro AI:** Xây dựng hệ thống học tập định tính yêu cầu độ chính xác rất cao. Việc thống kê chi tiết giúp đội ngũ phát hiện tức thời các lỗ hổng bảo mật (ví dụ như rò rỉ ranh giới prompts ở case `GS-11`) hoặc các lỗi vi phạm nghiêm trọng (bịa nguồn D3, kết luận sai D2) trước khi đưa sản phẩm tới tay học viên.
*   **Định lượng sự cải tiến:** Giúp chuyển hóa các đánh giá cảm tính ("AI chạy tạm ổn", "giao diện mượt") thành các chỉ số kỹ thuật rõ ràng (Tỉ lệ qua bộ 91.7%, 0 lỗi Hard-fail).

### 3. Giải quyết được gì? (What it solves)
*   **Rút ngắn chu kỳ gỡ lỗi và cải tiến (Faster iteration cycles):** Bằng cách phân tách tỉ lệ đạt theo từng lớp chỗ khó (①, ②, ③, ④), đội ngũ kỹ thuật biết chính xác mô hình đang yếu ở nhóm nghiệp vụ nào (ví dụ lớp ③ - Ngoài phạm vi) để tập trung tinh chỉnh prompt hoặc model config, thay vì sửa mò mẫm làm hỏng các phần khác.
*   **Bảo mật dữ liệu học viên & Tối ưu hóa chi phí:** Tách biệt dữ liệu nhạy cảm khỏi note chung, đồng thời biết được tỷ lệ sử dụng tài liệu thật (8.6%) để tối ưu hóa độ dài ngữ cảnh gửi lên API, giúp tiết kiệm chi phí vận hành token của mô hình.

---

## I. Khảo sát Nhu cầu & Quyết định Thiết kế Sản phẩm

Dưới đây là các số liệu nền tảng làm căn cứ cho việc định hình sản phẩm và các quyết định thiết kế lát cắt tính năng.

### 1. Số liệu khảo sát & Pain points

| Số liệu thống kê | Trích nguyên văn nguồn | Nguồn tệp & Dòng |
| :--- | :--- | :--- |
| **1.261 lượt hỏi-đáp**<br>**369 học viên** | "Data pack có 1.261 lượt hỏi–đáp giữa học viên và AI Tutor của 369 học viên." | [spec.md (Dòng 35)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L35) |
| **46,2% không có citation** | "46,2% phản hồi Tutor không có citation." | [spec.md (Dòng 38)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L38) |
| **73,5% (25/34 học viên)**<br>khó bắt đầu ôn tập | "25/34 (73,5%) từng muốn ôn lại nhưng khó xác định nên bắt đầu từ đâu" | [spec.md (Dòng 50)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L50) |
| **58,8% (20/34 học viên)**<br>gặp tình trạng này ≥ 2 buổi | "20/34 (58,8%) gặp tình huống này trong ít nhất 2 buổi." | [spec.md (Dòng 50)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L50) |

### 2. Quyết định phạm vi sản phẩm

*   **Đồng bộ Note + Mindmap:** Cả hai view được sinh từ cùng một kết quả phân tích, dùng chung nguồn và cập nhật đồng bộ khi học viên tương tác.
    *   *Nguồn:* [spec.md §2 (Dòng 65-70)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L65-L70)
    *   *Trích dẫn:* `"Note và mindmap không phải hai tính năng độc lập. Cả hai phải được sinh từ cùng một kết quả phân tích... cập nhật đồng bộ"`
*   **Tập trung vào Learning Trace cuối buổi:** Không xây dựng chatbot mới; quiz tự kiểm tra được chuyển vào backlog để giữ tính chất định tính của Learning Trace.
    *   *Nguồn:* [spec.md §1 & §2 (Dòng 57, 72-74)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L57)
    *   *Trích dẫn:* `"CP2 ưu tiên Personalized Note... Quiz tự kiểm tra được giữ ở backlog vì chưa nằm trong lát cắt hiện tại."`
*   **Lát cắt một câu (Core slice):**
    *   *Nguồn:* [spec.md §4 (Dòng 80)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L80)
    *   *Trích dẫn:* `"Khi một học viên vừa kết thúc buổi học muốn biết mình nên ôn lại gì, hệ thống phân tích lịch sử hỏi–đáp của học viên để quyết định các chủ đề đã tìm hiểu và các điểm có khả năng chưa vững, rồi tạo note cùng mindmap có căn cứ để học viên xem lại, xác nhận và chỉnh sửa."`

---

## II. Nguyên tắc Diễn giải Tín hiệu & Ràng buộc Hệ thống

Các quy tắc phân loại và logic chặn lỗi để đảm bảo tính an toàn, tránh việc suy diễn quá đà của mô hình AI.

### 1. Phân loại kết quả học tập
Hệ thống bắt buộc phải phân tách rõ ràng kết quả thành 3 nhóm dựa trên hành vi:
1.  **Đã tìm hiểu:** Có câu hỏi học thuật; chưa kết luận học viên yếu.
2.  **Có khả năng chưa vững:** Có bằng chứng hành vi (nói rõ "chưa hiểu", hỏi lại nhiều lần, phản biện chưa xong).
3.  **Chưa đủ dữ liệu để kết luận:** Lượt chat quá ngắn, chào hỏi, hoặc AI không tìm được nguồn đối chiếu chính thức.
    *   *Nguồn:* [spec.md (Dòng 84-88)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L84-L88)
    *   *Trích dẫn:* `"Hệ thống phải phân biệt ba loại kết quả: 1. Đã tìm hiểu... 2. Có khả năng chưa vững... 3. Chưa đủ dữ liệu để kết luận"`

### 2. Các signal không được dùng độc lập để kết luận "chưa vững"
Hệ thống tuyệt đối không được tự ý kết luận học viên hổng kiến thức chỉ dựa vào:
-   Đặt một câu hỏi nâng cao đơn thuần.
-   Tutor không trả lời được hoặc thiếu citation trong log cũ.
-   Học viên đánh giá `down` (vì có thể họ đánh giá chất lượng câu trả lời của AI chứ không phải họ không hiểu).
-   Khái niệm chỉ xuất hiện duy nhất 1 lần.
    *   *Nguồn:* [spec.md (Dòng 90-95)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L90-L95)
    *   *Trích dẫn:* `"Các signal sau không được dùng độc lập... Học viên đặt một câu hỏi nâng cao. Tutor không trả lời được... Học viên đánh giá down... Một khái niệm xuất hiện một lần"`

### 3. Quy tắc tạo output (Grounding & Allowlist)
Output của mô hình chỉ được tạo ra khi thỏa mãn các ràng buộc về nguồn học liệu chính thức:
-   `topics`: Chỉ tạo khi có tương tác học thuật rõ chủ đề **và** có ít nhất một nguồn slide/transcript chính thức được cấp.
-   `reviewItems`: Chỉ tạo khi có signal hành vi rõ ràng (hỏi lại, thú nhận chưa hiểu) **và** trỏ đúng về ID lượt tương tác làm bằng chứng + có nguồn chính thức tương ứng.
-   `unassessableItems`: Tạo khi tương tác không thuộc về học thuật (chào hỏi, logistics, prompt injection), thiếu nguồn chính thức, hoặc nguồn bị mâu thuẫn.
    *   *Nguồn:* [spec.md (Dòng 105-109)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/spec.md#L105-L109)
    *   *Chi tiết:* Cột "Chỉ tạo khi" trong bảng Chính sách signal.

---

## III. Kết quả Đánh giá & Kiểm thử (Lượt chạy 01)

Số liệu thực tế thu được từ lượt chạy đánh giá đầu tiên của Nguyễn Xuân Đức trên bộ 24 case kiểm thử (Golden Set).

### 1. Chỉ số tổng hợp

| Metric | Kết quả | Trích nguyên văn tệp kết quả | Nguồn tệp & Dòng |
| :--- | :--- | :--- | :--- |
| **Tỉ lệ qua bộ** | **91,7% (22/24 case)** | "Case đạt / tổng \| 22 / 24"<br>"Tỉ lệ qua bộ \| 91,7%" | [eval/runs/run-01.md (Dòng 57-58)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L57-L58) |
| **Vi phạm D2 (Hard fail)** | **0 case** | "Vi phạm D2 (hard) \| 0 case" | [eval/runs/run-01.md (Dòng 59)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L59) |
| **Vi phạm D3 (Hard fail)** | **0 case** | "Vi phạm D3 (hard) \| 0 case" | [eval/runs/run-01.md (Dòng 60)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L60) |
| **Đạt Quality Bar?** | **ĐẠT** (☑ Đạt) | "Đạt quality bar? \| ☑ Đạt" | [eval/runs/run-01.md (Dòng 61)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L61) |

### 2. Tỉ lệ đạt theo lớp độ khó

| Phân lớp case | Số case đạt | Tỉ lệ % | Trích nguyên văn tệp kết quả | Nguồn tệp & Dòng |
| :--- | :---: | :---: | :--- | :--- |
| **① Nguồn sự thật** | 4/4 | **100%** | "① Nguồn sự thật \| 4/4 \| 100%" | [eval/runs/run-01.md (Dòng 67)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L67) |
| **② Mơ hồ / thiếu thông tin** | 4/5 | **80%** | "② Mơ hồ \| 4/5 \| 80%" | [eval/runs/run-01.md (Dòng 68)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L68) |
| **③ Ngoài phạm vi** | 3/4 | **75%** | "③ Ngoài phạm vi \| 3/4 \| 75%" | [eval/runs/run-01.md (Dòng 69)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L69) |
| **④ Đặc thù domain** | 3/3 | **100%** | "④ Đặc thù domain \| 3/3 \| 100%" | [eval/runs/run-01.md (Dòng 70)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L70) |

### 3. Phân tích khoảng cách & Định hướng sửa đổi cho lượt 2
-   **Failure đau nhất được chọn để sửa:** Rò rỉ thông tin ranh giới do Prompt Injection ở case `GS-11` (Echo boundary từ prompt injection).
    *   *Nguồn:* [eval/runs/run-01.md (Dòng 83)](file:///d:/CODE/AITHUCCHIEN/LABS/Batch03-K4-2A202601328-Trandainghia/eval/runs/run-01.md#L83)
    *   *Trích dẫn:* `"Failure đau nhất chọn để sửa cho lượt 2: Echo boundary từ prompt injection (GS-11)."`

# Tóm tắt khảo sát nhu cầu ôn tập sau khi dùng VLearn Tutor

## 1. Mục đích và phạm vi

Khảo sát được thực hiện để kiểm chứng pain point của người học sau khi dùng AI Tutor: họ có nhận ra mình đã tìm hiểu gì, có xác định được phần cần ôn lại và có mất thời gian tổng hợp lại nội dung hay không.

Khảo sát không đo độ chính xác của AI, không chứng minh Learning Trace đã cải thiện điểm số và không thay thế cho vòng usability test ở CP5.

## 2. Kiểm tra dữ liệu

- **`n = 34` — đã chốt.** Nghi vấn "31 hay 34 người" phát sinh từ số đếm nhẩm trong nhóm làm việc đã được giải quyết bằng cách kiểm lại trực tiếp `research/survey-log.csv`: file có đúng **34 dòng dữ liệu**, mã `R01`–`R34` **không trùng lặp**, **không có dòng rỗng**, **không có dòng test**. Mọi phần trăm trong bản này tính trên `n = 34` trừ khi ghi rõ mẫu khác.
- Cách kiểm lại được: đếm số dòng của `survey-log.csv` trừ dòng tiêu đề; kiểm tính duy nhất của cột `respondent_id`; kiểm không dòng nào rỗng toàn bộ trường.
- Các câu hỏi lý do và nhu cầu đầu ra là câu hỏi chọn nhiều đáp án; tổng số lựa chọn không dùng để suy ra số người.
- **Câu thời gian có 4 phiếu lỗi form.** 4 phản hồi trả về nhãn `Tùy chọn 3` — đây là lỗi form (một lựa chọn chưa được đặt tên), không phải câu trả lời của người dùng. Bốn phiếu này được **mã hóa thành `không rõ` và loại khỏi mẫu của riêng câu thời gian**, nên câu đó có **mẫu hợp lệ `n = 30`**. Các câu khác vẫn dùng đủ 34 phiếu.
- **`Tôi đã bỏ qua và không ôn lại` là một câu trả lời hợp lệ, không phải phiếu trống.** Đây là lựa chọn mô tả hành vi (đã từ bỏ việc ôn), nên được giữ trong mẫu hợp lệ và tính là bằng chứng pain, không tính là dữ liệu thiếu.
- Không đưa timestamp, định danh hoặc raw response vào giao diện demo. Bản log khảo sát đầy đủ được giữ riêng trong `research/survey-log.csv` với mã ẩn danh R01–R34.

## 3. Kết quả định lượng sơ bộ

### Mức độ sử dụng AI Tutor

| Số buổi đã dùng trong 3 buổi gần nhất | Số người | Tỷ lệ trên 34 dòng |
|---|---:|---:|
| 0 buổi | 6 | 17,6% |
| 1 buổi | 12 | 35,3% |
| 2 buổi | 9 | 26,5% |
| 3 buổi | 7 | 20,6% |
| Ít nhất 1 buổi | 28 | 82,4% |

### Khó xác định nên bắt đầu ôn từ đâu

| Số buổi muốn ôn lại nhưng khó bắt đầu | Số người | Tỷ lệ |
|---|---:|---:|
| 0 buổi | 9 | 26,5% |
| 1 buổi | 5 | 14,7% |
| 2 buổi | 10 | 29,4% |
| 3 buổi | 10 | 29,4% |
| Ít nhất 1 buổi | 25 | 73,5% |
| Ít nhất 2 buổi | 20 | 58,8% |

Đây là bằng chứng trực tiếp cho lát cắt sản phẩm: sau buổi học, người học cần biết nên ôn nội dung nào trước.

### Cách ôn lại hiện tại

| Hành vi sau buổi học | Số người |
|---|---:|
| Mở lại slide/tài liệu | 10 |
| Dùng ChatGPT/công cụ khác | 7 |
| Không ôn lại | 6 |
| Tự viết ghi chú | 4 |
| Đọc lại lịch sử chat | 4 |
| Hỏi bạn hoặc TA | 2 |
| Xem lại video bài giảng | 1 |

Các hành vi cho thấy việc ôn tập đang bị chia nhỏ giữa slide, lịch sử chat, ghi chú cá nhân và công cụ bên ngoài. Đây là lý do nhóm chọn một output cuối buổi tập trung thay vì thêm một chatbot mới.

### Nội dung người học muốn thấy trong bản tổng hợp

| Thành phần mong muốn | Số người | Tỷ lệ |
|---|---:|---:|
| Các chủ đề đã tìm hiểu | 17 | 50,0% |
| Phần có thể cần xem lại | 16 | 47,1% |
| Giải thích ngắn cho từng khái niệm | 15 | 44,1% |
| Mindmap liên kết các khái niệm | 14 | 41,2% |
| Khả năng xác nhận hoặc sửa nhận định | 10 | 29,4% |
| Câu hỏi tự kiểm tra | 10 | 29,4% |
| Citation về đúng slide/tài liệu | 9 | 26,5% |
| Lý do hệ thống cho rằng cần xem lại | 4 | 11,8% |

Các lựa chọn là multi-select nên một người có thể xuất hiện ở nhiều dòng.

### Thời gian tìm và tổng hợp lại

Mẫu hợp lệ `n = 30` (đã loại 4 phiếu lỗi form `Tùy chọn 3`, xem mục 2).

| Thời gian cho lần gần nhất | Số người | Tỷ lệ trên 30 |
|---|---:|---:|
| Dưới 5 phút | 1 | 3,3% |
| 5–10 phút | 7 | 23,3% |
| 11–20 phút | 13 | 43,3% |
| Trên 20 phút | 5 | 16,7% |
| Đã bỏ qua, không ôn lại | 4 | 13,3% |
| **Tốn ≥11 phút** | **18** | **60,0%** |
| **Tốn ≥11 phút hoặc bỏ luôn không ôn** | **22** | **73,3%** *(22/34 = 64,7% trên toàn mẫu)* |

Nhóm "đã bỏ qua, không ôn lại" là mức đau cao nhất chứ không phải dữ liệu thiếu: chi phí tổng hợp lại đủ lớn để 4 người từ bỏ hẳn việc ôn.

### Tỷ lệ xác nhận pain — đối chiếu chuẩn A

Rubric yêu cầu khảo sát ≥20 người ngoài nhóm và ≥50% xác nhận. Cả hai điều kiện đều đạt:

| Cách tính | Kết quả | Đạt chuẩn A? |
|---|---:|---|
| Cỡ mẫu | 34 người | ✅ ≥20 |
| **Xác nhận (rộng)** — từng có ≥1 buổi khó xác định nên bắt đầu ôn từ đâu | **25/34 = 73,5%** | ✅ ≥50% |
| Xác nhận (mức nặng) — gặp ở ≥2 buổi | 20/34 = 58,8% | ✅ |
| **Xác nhận (chặt)** — vừa khó xác định điểm bắt đầu, **vừa** tốn ≥11 phút hoặc bỏ luôn | **16/34 = 47,1%** *(16/30 = 53,3% trên mẫu hợp lệ câu thời gian)* | — |

Con số dùng khi trình bày: **73,5% xác nhận pain**, kèm **47,1% xác nhận theo tiêu chí chặt** (vừa khó định vị vừa trả giá thật). Ghi cả hai để người đọc thấy nhóm tự siết tiêu chí thay vì chỉ lấy số cao nhất.

## 4. Pain point định tính

Các câu trả lời mở được ẩn danh bằng mã dòng. Một số quote giữ nguyên cách viết của người trả lời:

> “Không lưu lại lịch sử trò chuyện khiến việc đọc lại của tôi bị gián đoạn.” — R02

> “Tutor không tóm tắt được đầy đủ nội dung cần thiết.” — R10

> “ai tutor không thể tổng hợp nội dung nếu chưa được hỏi trước đó.” — R13

> “Mất tgian.” — R15

> “Khó nhớ bài.” — R29

> “Phải đi research ở ngoài.” — R33

Các quote này củng cố ba vấn đề: lịch sử học tập bị rời rạc, người học phải tự tổng hợp lại và không có điểm bắt đầu rõ ràng khi ôn.

## 5. Bảng impact và quyết định phạm vi

| Ứng viên | Bằng chứng | Tần suất / hậu quả | Khả thi trong hackathon | Quyết định |
|---|---|---|---|---|
| Learning Trace cuối buổi | 25/34 từng khó xác định nên bắt đầu ôn từ đâu | 20/34 gặp trong ít nhất 2 buổi; dễ bỏ qua việc ôn | Cao với mock data và một AI call ở CP3 | **Chọn** |
| Note có nguồn đối chiếu | 9/34 chọn citation; nhiều quote nhắc Tutor thiếu chi tiết/căn cứ | Người học mất niềm tin hoặc phải research ngoài | Cao nếu grounding vào slide/transcript | **Chọn làm nguyên tắc bắt buộc** |
| Mindmap liên kết kiến thức | 14/34 chọn mindmap | Giúp nhìn quan hệ giữa các chủ đề thay vì đọc lại chat dài | Cao ở CP2; dùng HTML/SVG/CSS | **Chọn trong output** |
| Quiz tự kiểm tra | 10/34 chọn câu hỏi tự kiểm tra | Có giá trị nhưng cần thiết kế câu hỏi, chấm và tiêu chí đánh giá | Trung bình/thấp trong lát cắt hiện tại | **Để backlog** |
| Bản đồ lỗ hổng cấp lớp cho giảng viên | Chưa có câu hỏi khảo sát trực tiếp cho nhu cầu giảng viên | Mở rộng actor, quyền truy cập và privacy | Thấp trong thời gian hiện tại | **Loại khỏi CP2** |

## 6. Tác động đến thiết kế CP2

- Hiển thị **Personalized Note** theo từng ngày học để người học biết nội dung thuộc buổi nào.
- Tách rõ “đã tìm hiểu”, “gợi ý cần xác nhận/xem lại” và “chưa đủ dữ liệu”; không dùng ngôn ngữ kết luận người học yếu.
- Gắn citation và lượt hỏi Tutor vào mỗi nhận định để người học kiểm tra được căn cứ.
- Cho phép người học chọn “Mình đã hiểu” hoặc “Cần xem lại”; phản hồi cập nhật cả note, metric và mindmap.
- Giữ quiz ngoài CP2 dù có nhu cầu; đưa vào backlog để tránh biến Learning Trace thành công cụ chấm điểm.

## 7. Hạn chế và bước xác minh tiếp theo

- Mẫu khảo sát thuận tiện, chưa đại diện cho toàn bộ người học.
- ~~Cần xác minh số phản hồi hợp lệ là 31 hay 34 và sửa giá trị `Tùy chọn 3`.~~ **Đã xử lý:** `n = 34` đã chốt bằng cách kiểm trực tiếp `survey-log.csv`; 4 phiếu `Tùy chọn 3` đã mã hóa `không rõ` và mẫu câu thời gian là 30 (xem mục 2).
- Lỗi form ở câu thời gian là lỗi của chính nhóm khi dựng form, không phải lỗi người trả lời — ghi nhận lại để không lặp ở vòng validation CP5.
- 12/34 người chọn lý do dùng Tutor là "chỉ muốn thử hệ thống" và 6/34 chưa dùng Tutor buổi nào; một phần mẫu vì vậy chưa phải người dùng có nhu cầu thật. Con số xác nhận pain nên đọc cùng ràng buộc này.
- Câu hỏi về nội dung mong muốn trong bản tổng hợp liệt kê sẵn đúng các thành phần nhóm dự định làm, nên là **câu hỏi dẫn dắt**: chỉ dùng để xếp ưu tiên tính năng, không dùng làm bằng chứng chứng minh pain.
- Survey mới xác minh nhu cầu và pain point. Ở CP5, nhóm cần test prototype với ít nhất 5 người ngoài nhóm, quan sát họ hoàn thành task và ghi quote nguyên văn.
- Các chỉ số usability cần đo riêng: thời gian tìm được phần cần ôn, tỷ lệ tìm được citation, khả năng hiểu gợi ý và mức độ tin tưởng.

# Lượt chạy 01 — *chưa chạy*

> Lượt này chạy **ngay sau khi lời gọi AI thật vào quyết định phân loại signal** (mốc CP3). Bảng dưới đã dựng sẵn để điền, không được sửa cột hay đổi bộ case.

| Trường | Giá trị |
|---|---|
| Thời điểm chạy | *chờ CP3* |
| Người chạy | Nguyễn Xuân Đức |
| Model / prompt version | |
| Bộ case | `eval/golden-set.jsonl` — 24 case, chốt 2026-07-30 |
| Rubric chấm | `eval/rubric-cham.md` |
| Chấm chéo 5 case đã khớp? | ☐ chưa |

## Quality bar đối chiếu

> Đạt khi **≥ 70%** case qua bộ, **VÀ** 0 case vi phạm D3 (bịa nguồn), **VÀ** 0 case vi phạm D2 (kết luận chưa vững khi không có signal hành vi).

Bar chốt trong `spec.md §7` lúc 23:59 ngày 2026-07-30 và giữ nguyên đến CP6.

## Kết quả từng case

Ghi **mọi** case, kể cả case chưa đạt. Cột "Chiều fail" để trống nếu đạt.

| Case | Lớp | D1 | D2 | D3 | D4 | D5 | D6 | Đạt? | Chiều fail · biểu hiện quan sát được |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| GS-01 | ① | | | | | | | | |
| GS-02 | ① | | | | | | | | |
| GS-03 | ① | | | | | | | | |
| GS-04 | ① hiếm | | | | | | | | |
| GS-05 | ② | | | | | | | | |
| GS-06 | ② | | | | | | | | |
| GS-07 | ② | | | | | | | | |
| GS-08 | ② | | | | | | | | |
| GS-09 | ② | | | | | | | | |
| GS-10 | ③ | | | | | | | | |
| GS-11 | ③ hiếm | | | | | | | | |
| GS-12 | ③ | | | | | | | | |
| GS-13 | ③ hiếm | | | | | | | | |
| GS-14 | ④ | | | | | | | | |
| GS-15 | ④ | | | | | | | | |
| GS-16 | ④ | | | | | | | | |
| GS-17 | thường | | | | | | | | |
| GS-18 | thường | | | | | | | | |
| GS-19 | thường | | | | | | | | |
| GS-20 | thường | | | | | | | | |
| GS-21 | thường | | | | | | | | |
| GS-22 | thường | | | | | | | | |
| GS-23 | hiếm | | | | | | | | |
| GS-24 | thường | | | | | | | | |

Ký hiệu: `P` pass · `F` fail · `—` chiều không áp dụng cho case này.

## Tổng hợp

| Chỉ số | Kết quả |
|---|---|
| Case đạt / tổng | __ / 24 |
| **Tỉ lệ qua bộ** | __ % |
| Vi phạm D2 (hard) | __ case |
| Vi phạm D3 (hard) | __ case |
| **Đạt quality bar?** | ☐ Đạt ☐ Không đạt |

### Tỉ lệ theo lớp chỗ khó

| Lớp | Đạt / tổng | % |
|---|---|---|
| ① Nguồn sự thật | __ / 4 | |
| ② Mơ hồ / thiếu thông tin | __ / 5 | |
| ③ Ngoài phạm vi / thẩm quyền | __ / 4 | |
| ④ Đặc thù domain | __ / 3 | |
| Case thường | __ / 8 | |

## Phân tích khoảng cách

*(Bắt buộc điền kể cả khi đạt bar. Không đạt bar mà phân tích được nguyên nhân vẫn tính đủ điểm R4; sửa số liệu thì không được tính.)*

**Nhóm lỗi quan sát được** — đặt tên cho lỗi, mỗi lỗi ghi trigger → biểu hiện → hậu quả:

| Tên lỗi | Trigger | Biểu hiện | Hậu quả với học viên | Case dính |
|---|---|---|---|---|
| | | | | |

**Failure đau nhất chọn để sửa cho lượt 2** *(chọn đúng một)*:

**Vì sao chọn nó**:

**Sửa gì**:

**Chạy lại trọn bộ sau khi sửa** → `run-02.md`. Sửa chỗ này vỡ chỗ kia là chuyện thường của prompt, nên không chấp nhận chỉ chạy lại các case đã fail.

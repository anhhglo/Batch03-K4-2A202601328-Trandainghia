# B2 & B3 — Kiểu của `unassessableItems` và `relationships`

**Gửi:** Trần Đại Nghĩa (output contract) + Hoàng Trọng Đại (types & UI)
**Từ:** Phó Hiếu Anh (Data & Evidence) · 2026-07-30

`workflow.md` §3 và `codebase/src/types/learning-trace.ts` đang mâu thuẫn ở hai trường. Tôi không sửa file types vì nó nằm trong danh sách "không sửa cùng lúc" của `workflow.md` §6 — thay vào đó tôi đo dữ liệu thật để câu trả lời tự lộ ra, và cài sẵn phần thuộc tầng data.

| Trường | Contract §3 | Types hiện tại |
|---|---|---|
| Mục "chưa đủ dữ liệu" | `unassessableItems: UnassessableItem[]` | `unassessableNote: string` |
| Quan hệ mindmap | `relationships: MindmapRelationship[]` | `Topic.mindmapChild: string` |

---

## B2 · Dữ liệu quyết định: phải là mảng

Tôi phân loại toàn bộ 1.261 lượt theo lý do không đánh giá được, rồi đếm theo phiên `(user_id, day_code)`:

| | Phiên | Tỷ lệ |
|---|---:|---:|
| Có **≥1** lượt không đánh giá được | 518/563 | **92,0%** |
| Có **≥2** lượt — một chuỗi không mang nổi | **246/563** | **43,7%** |
| Không có lượt nào | 45/563 | 8,0% |
| Phiên nhiều nhất | **30 lượt** | |

**43,7% số phiên có từ hai mục trở lên.** Spec §4 đòi *"mỗi nhận định trỏ được về lượt chat liên quan"*; với một chuỗi `unassessableNote`, gần một nửa số phiên **không thể** giữ được lời hứa đó. Phiên nặng nhất có 30 mục — nhét vào một câu là mất sạch truy vết.

Phân bố lý do:

| Lý do | Lượt | % |
|---|---:|---:|
| `source-unmappable` — không ánh xạ được học liệu | 1.038 | 82,3% |
| `too-short` — quá ngắn và không có đoạn bôi đen làm chỗ dựa | 77 | 6,1% |
| `template-only` — không gõ gì và đoạn bôi đen cũng quá ngắn | 32 | 2,5% |
| `out-of-scope` — injection hoặc đòi chấm điểm | 11 | 0,9% |
| `logistics` | 9 | 0,7% |
| **Đánh giá được đầy đủ** | **94** | **7,5%** |

### Kiểu đề xuất

```ts
export type UnassessableReason =
  | "template-only"
  | "too-short"
  | "logistics"
  | "out-of-scope"
  | "source-unmappable";

export interface UnassessableItem {
  turnId: string;
  reason: UnassessableReason;
  /** Câu giải thích hiển thị được cho học viên, không phải mã lỗi. */
  explanation: string;
  page?: number;
}
```

Đã cài tại `codebase/src/lib/trace/unassessable.ts` + 16 test. `collectUnassessableItems(input)` trả đúng mảng này.

### Một ranh giới quan trọng test đã bắt được

Bản đầu tôi chấm "quá ngắn" chỉ dựa vào chữ học viên gõ. Test fixture đỏ ngay tại lượt `T1067`: học viên gõ `"là gì"` (5 ký tự) nhưng **đoạn bôi đen là "Affinity Mapping"**. Cộng lại, đó là câu hỏi hoàn toàn rõ nghĩa — quy tắc cũ vứt nhầm một chủ đề mà học viên thật sự đã tìm hiểu.

Ranh giới đúng theo spec §4 là **hai mức khác nhau**:

| | Cần gì | Số lượt |
|---|---|---:|
| Xếp vào `topics_explored` | đoạn bôi đen **hoặc** chữ học viên | 1.152 (91,4%) |
| Suy ra `possible_gaps` | **bắt buộc** có chữ học viên tự gõ | 812 (64,4%) |

Nên có thêm `canAssessUnderstanding(interaction)` — đã cài. **449 lượt (35,6%) chỉ được xếp chủ đề, tuyệt đối không được dùng để suy ra mức độ hiểu.**

---

## B3 · Dữ liệu quyết định: phải là mảng, và thường rỗng

Spec §5 kịch bản 8 quy định *"chỉ giữ edge có citation hỗ trợ"*. Tôi đếm số phiên có đủ **≥2 trang nguồn kiểm chứng được** — điều kiện tối thiểu để vẽ nổi **một** edge:

| Cách tính | Phiên vẽ được ≥1 edge | Tỷ lệ |
|---|---:|---:|
| **Chặt** — citation kiểm chứng được (đúng spec §5) | **9/563** | **1,6%** |
| Lỏng — có citation bất kỳ, không kiểm chứng | 207/563 | 36,8% |

**Theo đúng spec, 98,4% số phiên không vẽ nổi một cạnh nào có căn cứ.**

Đây không chỉ là câu hỏi về kiểu dữ liệu — nó là rủi ro sản phẩm. Mindmap sẽ là **một chùm node rời không có cạnh** trong hầu hết trường hợp. Nhóm nên biết điều này trước khi demo, và nên chuẩn bị câu trả lời cho giám khảo.

`Topic.mindmapChild: string` buộc **đúng một** chuỗi con cho mỗi chủ đề. Nó không biểu diễn được trạng thái phổ biến nhất — **không có quan hệ nào đủ căn cứ** — và cũng không biểu diễn được chủ đề có hai quan hệ trở lên.

### Kiểu đề xuất

```ts
export interface MindmapRelationship {
  fromTopicId: string;
  toTopicId: string;
  label: string;
  /** Nguồn chứng minh QUAN HỆ này, không phải nguồn của hai đầu. */
  sourceId: string;
  page?: number;
}
```

Và `relationships: MindmapRelationship[]` ở cấp `LearningDay`, mặc định `[]`.

### Ba việc UI phải xử vì con số 1,6%

1. **Mindmap không cạnh là trạng thái BÌNH THƯỜNG**, không phải lỗi. Cần một câu giải thích tử tế thay vì màn hình trống.
2. **Không được vẽ cạnh "gợi ý" không có nguồn** để mindmap đỡ trống — đó đúng là kịch bản 8 của spec §5 và là chiều D3 của quality bar.
3. Fixture `day02Happy` tình cờ nằm trong **9 phiên hiếm hoi** vẽ được cạnh (trang 16 và 17 đều kiểm chứng được) — demo được happy path, nhưng đừng nhầm nó là điển hình.

---

## Cần hai bạn quyết

| # | Câu hỏi | Ai |
|---|---|---|
| 1 | Đổi `unassessableNote: string` → `unassessableItems: UnassessableItem[]`? Dữ liệu nói phải đổi. | Nghĩa + Đại |
| 2 | Thêm `canAssessUnderstanding` thành ràng buộc trong prompt: 449 lượt chỉ được xếp chủ đề? | Nghĩa |
| 3 | Đổi `Topic.mindmapChild: string` → `relationships: MindmapRelationship[]` cấp `LearningDay`? | Nghĩa + Đại |
| 4 | Mindmap không cạnh (98,4% phiên) hiển thị thế nào? | Đại |

Tôi không sửa `types/learning-trace.ts`. Khi hai bạn chốt, tôi cập nhật fixture và adapter phía data trong vòng một commit.

## Cách kiểm lại mọi con số ở đây

```bash
bash research/scripts/run-tests.sh
```

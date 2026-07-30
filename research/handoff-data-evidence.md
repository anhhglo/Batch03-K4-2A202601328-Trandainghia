# Bàn giao & điều phối — Data & Evidence Owner

**Người viết:** Phó Hiếu Anh · **Cập nhật:** 2026-07-30 · **Branch:** `feat/data-normalizer`

File này gồm ba phần: (1) những gì tôi **giao** cho từng người, (2) những gì tôi **cần** từ từng người mới làm tiếp được, (3) những mâu thuẫn tôi phát hiện trong repo mà **cả nhóm phải quyết**, không ai tự sửa được một mình.

---

## 0. Cần chốt trong nhóm — xếp theo mức chặn

| # | Việc cần chốt | Ai quyết | Chặn ai | Gấp |
|---|---|---|---|---|
| **B1** | Đường dẫn thật của code: `src/...` hay `codebase/src/...`? | Nghĩa | **cả 5 người** | Ngay |
| **B2** | `unassessableItems` là mảng hay chỉ một dòng ghi chú? Contract và UI đang lệch nhau | Nghĩa + Đại | tôi, Tuấn Anh, Đại | Ngay |
| **B3** | `relationships` cho mindmap: mảng quan hệ hay chuỗi `mindmapChild` như hiện tại? | Nghĩa + Đại | tôi, Đại | Ngay |
| **B4** | `eval/` và `zpec.md` đang chứa nội dung thuộc vai của Đức — giữ, sửa, hay viết lại theo `.jsonl`? | Đức | Đức | Trước CP3 |
| **B5** | `EvidenceModal` gắn cứng nhãn "Đã đối chiếu nguồn" cho mọi nội dung | Đại | Đại | Trước CP3 |
| **B6** | Signal "hỏi lại cùng nội dung" định nghĩa thế nào để đếm được? | Đức | — | ✅ đã đo & cài sẵn, chờ Đức duyệt: `research/b6-follow-up-signal.md` |

---

## 1. Phần của tôi

### 1.1 · Đã xong

| Việc | File | Trạng thái |
|---|---|---|
| Evidence đường A — khảo sát | `research/survey-summary.md`, `research/survey-log.csv` | ✅ n=34 đã chốt, 3 số sai đã sửa |
| Evidence đường B — mining | `research/mining-log.md` | ✅ 5 phát hiện, 12 quote nguyên văn |
| Tầng mining tái lập được | `research/scripts/mine_chatlog.py` → `research/metrics.json` | ✅ pin theo `sha256` của CSV |
| Test | `research/scripts/test_mine_chatlog.py` | ✅ **22/22 xanh** |
| Dữ liệu audit cho người ngoài kiểm | `research/samples/*.tsv` | ✅ 5 bucket |

```bash
python3 research/scripts/mine_chatlog.py --samples
python3 research/scripts/test_mine_chatlog.py     # phải 22/22
```

### 1.2 · Bốn module code — đã xong

| Module | File | Test |
|---|---|---|
| Source manifest | `codebase/src/lib/grounding/source-manifest.ts` | 12 |
| Normalizer | `codebase/src/lib/trace/normalize.ts` | 17 |
| Signal "hỏi lại" (B6) | `codebase/src/lib/trace/follow-up-signal.ts` | 17 |
| Fixture Day02 | `codebase/src/data/learning-trace-fixtures.ts` | 6 |

**Đặt ở `codebase/src/` chứ không phải `src/`** như `workflow.md` §4 ghi: `tsconfig` map `@/*` → `./src/*` tương đối với `codebase/`, và không có `src/` nào ở gốc repo. Đây là nơi duy nhất code biên dịch được — xem B1.

Fixture hoá ra **không** bị chặn bởi B2/B3: theo DoD của CP3, fixture là **đầu vào** của `POST /api/learning-trace`, mà `LearningTraceInput` đã chốt trong `workflow.md` §3. Hai trường đang tranh chấp nằm ở phía output.

```bash
bash research/scripts/run-tests.sh    # 74 test + tsc + eslint
```

---

## 2. Tôi giao gì cho ai

### 2.1 → Trần Đại Nghĩa (Core LLM Owner)

**Phát hiện quan trọng nhất cho system prompt của bạn.** 99,3% lượt hỏi có tiền tố platform và nội dung slide dán vào. Nếu đưa nguyên trường `content` cho model, model sẽ đọc **chữ của giảng viên trên slide** như thể là câu hỏi của học viên.

Tôi đã mắc đúng lỗi này ở lượt đếm đầu và nó thổi phồng số liệu **6,1 lần**:

| | Đếm trên `content` thô | Đếm trên chữ học viên tự gõ |
|---|---:|---:|
| Học viên nói rõ chưa hiểu | 49 (3,9%) | **8 (0,6%)** |
| Câu hỏi logistics | 12 | **5** |

7/12 lượt bị gán nhãn "logistics" thực ra khớp cụm *"chatbot hỗ trợ sinh viên VinUni đăng ký môn học"* nằm trong **đề bài tập trên slide**.

→ Normalizer của tôi sẽ trả về **hai trường tách bạch**: `question` (đã bỏ tiền tố) và `studentText` (chỉ chữ học viên gõ). **Prompt nên phân biệt rõ hai trường này**, và signal về mức độ hiểu bài chỉ được đọc từ `studentText`.

**Con số cho phần "chống hallucination" của bạn:** chỉ **8,6%** lượt có `day_code` đối chiếu được với slide trong pack; 46,2% phản hồi Tutor không có citation; trang được cite lớn nhất là **96** trong khi pack chỉ có 29 trang/bộ. Tức với ~91% dữ liệu, **không thể** kiểm chứng citation → nhánh "thiếu nguồn thì không sinh giải thích" là đường chính, không phải ngoại lệ.

### 2.2 → Nguyễn Xuân Đức (AI Evaluation Owner)

**Bàn giao — hai thứ đang nằm trong vai của bạn mà tôi đã lỡ push khi chưa được phân vai:**

| File | Nội dung | Đề nghị |
|---|---|---|
| `eval/golden-set.md` | 24 case, 20 từ chatlog thật, phủ ≥2 case/lớp chỗ khó | Dùng làm nội dung nguồn, bạn quyết chuyển `.jsonl` hay giữ `.md` |
| `eval/rubric-cham.md` | 6 chiều pass/fail + biên bản chấm chéo | như trên |
| `eval/run-01.md` | bảng kết quả trống | như trên |
| `zpec.md` | §7 Kiểm thử + quality bar đề xuất ≥70% + 2 điều kiện cứng | **Quality bar là quyền của bạn** — con số 70% chỉ là đề xuất |

**Một số liệu trong đó cần sửa:** `zpec.md`, `eval/golden-set.md` và `eval/rubric-cham.md` đang ghi *"chỉ 7,2% (91/1261) `day_code` đối chiếu được"*. Con số đúng là **8,6% (108/1261)** — regex cũ bỏ sót `day_code` có dấu cách (`Day 1`, `Day 2`, 17 lượt). Kết luận thiết kế không đổi, chỉ đổi con số. Tôi không sửa vì file thuộc vai bạn.

**B6 — đã làm xong phần đo, chờ bạn duyệt:** `research/b6-follow-up-signal.md`. Tóm tắt: định nghĩa thô "cùng trang" gắn cờ 318 lượt (25,2%) và lẫn đầy rác. Tôi đo 9 định nghĩa ứng viên, chọn R14 → **29 lượt (2,3%)**, audit tay 100% được **precision 86,2%** (25/29). Đã cài ở `codebase/src/lib/trace/follow-up-signal.ts` kèm 17 test và phép đối chiếu chéo TS↔Python. **Khuyến nghị: không tự động thành `possible_gap`** — dùng `confidence: "low"` và bắt buộc học viên xác nhận. Ba câu cần bạn trả lời ở mục 7 của memo.

**Số liệu nền cho golden set:** median 1 lượt/phiên · 51,9% phiên chỉ 1 lượt · 50 phiên có ≥5 lượt. Nếu golden set toàn phiên dày thì nó không phản ánh dữ liệu thật.

### 2.3 → Trần Tuấn Anh (Backend & Integration Owner)

Hai hàm tôi sẽ cung cấp, dùng ngay trong `POST /api/learning-trace`:

```ts
// codebase/src/lib/grounding/source-manifest.ts
export function resolveSources(dayCode: string): SourceResolution;
export function verifyCitation(dayCode: string, page: number): CitationCheck;

// codebase/src/lib/trace/normalize.ts
export function normalizeInteractions(
  rows: readonly RawTutorRow[],
  filter: { learnerId: string; dayCode: string; conversationId?: string },
  sourceResolution: SourceResolution,   // truyền vào, hàm không tự gọi manifest
): LearningTraceInput;

// codebase/src/lib/trace/follow-up-signal.ts
export function detectFollowUpSignals(
  interactions: readonly NormalizedInteraction[],
): FollowUpSignal[];
```

**`verifyCitation()` bắt thêm một tầng bạn cần cho citation guardrail:** bộ slide trong pack là bản rút gọn 29 trang còn Tutor production trích tới trang 96, nên chỉ **41/1.261 lượt (3,3%)** có citation thực sự kiểm chứng được — thấp hơn nhiều so với 8,6% `day_code` map được.

**`resolveSources` không bao giờ trả mảng rỗng im lặng.** Với ~91% `day_code`, nó trả `status: "unmappable"` kèm lý do đọc được. Citation guardrail của bạn nên rẽ nhánh theo `status` này thay vì tự đoán: `unmappable` → toàn bộ nội dung phải vào `unassessableItems`, không gọi model để sinh giải thích.

Fixture Day02 tôi giao sẽ chạy được ngay không cần DB.

### 2.4 → Hoàng Trọng Đại (Frontend & Validation Owner)

**Fixture Day02** (`day02-c301`, học viên `U0323`, 4 lượt) — nằm trong 8,6% `day_code` đối chiếu được với bộ slide Day 2 thật, nên demo có citation kiểm chứng được:

| Lượt | Nội dung | Vai trò |
|---|---|---|
| `T0611` | Double Diamond, Trang 16 | chủ đề có nguồn |
| `T0223` | *"vậy nó liên quan gì đến diamond ?"* — hỏi lại **cùng Trang 16** | signal gap hợp lệ |
| `T1067` | Affinity Mapping, Trang 17 | chủ đề |
| `T0326` | Ma trận Impact–Effort, Trang 17 | chủ đề |

Đủ cả ba nhánh: chủ đề có nguồn · gap có bằng chứng · phiên đủ mỏng để giống thực tế.

**Hai việc trong UI cần bạn xử (B5):**

1. `EvidenceModal.tsx` dòng 78–80 gắn cứng nhãn **"Đã đối chiếu nguồn"** cho **mọi** nội dung mở ra. Với ~91% dữ liệu không đối chiếu được, nhãn này là một khẳng định sai — vi phạm đúng chiều D3 và nguyên tắc G2 trong spec §4b. Nhãn nên đọc từ trạng thái thật (`mapped` / `unmappable`).
2. `EvidenceDetail` hiện chỉ có `{eyebrow, title, description, meta}` — **không mang `turnId` hay `sourceId`**. Spec §4 yêu cầu mỗi nhận định trỏ được về lượt chat và trang slide; hiện tại truy vết mới ở mức trình bày. Nếu bạn thêm hai trường đó, normalizer của tôi cấp sẵn.

---

## 3. Tôi cần gì từ ai

| Cần | Từ ai | Không có thì sao |
|---|---|---|
| **B1** — chốt đường dẫn `src/` hay `codebase/src/` | Nghĩa | Tôi đặt file sai chỗ, Phase 2 integration vỡ |
| **B2** — `unassessableItems`: mảng hay chuỗi? | Nghĩa + Đại | Fixture của tôi sai kiểu, Đại phải sửa lại UI |
| **B3** — `relationships` mảng hay `mindmapChild` chuỗi? | Nghĩa + Đại | như trên |
| **B6** — duyệt định nghĩa R14 (đã cài sẵn) | Đức | Signal chạy nhưng chưa được phép sinh gap cho tới khi có người chốt |
| Nơi gọi `normalizeInteractions()` trong route | Tuấn Anh | Tôi không biết trả `LearningTraceInput` hay trả rows |

---

## 4. Mâu thuẫn phát hiện trong repo

### 4.1 · Đường dẫn trong `workflow.md` không tồn tại (B1)

`workflow.md` §4 giao file theo đường dẫn `src/lib/...`, `src/data/...`. Nhưng app Next.js thật nằm ở **`codebase/src/...`**. Không thư mục `src/` nào ở gốc repo, cũng chưa có `contracts/` hay `prompts/`.

Nếu mỗi người đoán một kiểu, Phase 2 sẽ có hai cây thư mục song song.

### 4.2 · Output contract lệch với type UI đang dùng (B2, B3)

| Trường | `workflow.md` §3 contract | `codebase/src/types/learning-trace.ts` hiện tại |
|---|---|---|
| Mục "chưa đủ dữ liệu" | `unassessableItems: UnassessableItem[]` | `unassessableNote: string` — **một chuỗi** |
| Quan hệ mindmap | `relationships: MindmapRelationship[]` | `Topic.mindmapChild: string` — **một chuỗi/topic** |
| Độ tin cậy | không khai báo | `confidence: "medium" \| "low"` — không có `"high"` |

Đây không phải chi tiết nhỏ: `unassessableItems` là **mảng** thì mỗi lượt không đánh giá được mới trỏ về `turnId` riêng — đúng yêu cầu spec §4. Là **chuỗi** thì cả buổi chỉ có một câu chung, không truy vết được lượt nào.

### 4.3 · UI đang gắn cứng lời khẳng định về nguồn (B5)

Xem mục 2.4. Đây là chỗ dễ bị giám khảo bắt nhất khi demo case thiếu nguồn.

### 4.4 · `LearningTraceApp.tsx` nhập mock ở cấp module

Dòng 29 và 35: `import { mockLearningTrace }` rồi `const trace = mockLearningTrace` ngoài component. Muốn nối API phải có một seam — đó là `learning-trace-adapter.ts` của Đại. Fixture của tôi sẽ giữ **đúng shape** mà `mockLearningTrace` đang có để đổi qua lại không phải sửa component.

### 4.5 · Ranh giới vai đã đổi giữa `canvas.md` và bản CP1

Canvas bản mới bỏ *"bảng impact"* và *"evidence log"* khỏi tên tôi, thêm *"data normalizer, lọc theo `day_code`/conversation, source manifest"*. Bảng impact hiện nằm ở `research/survey-summary.md` §5 — **file trong thư mục của tôi nhưng nội dung thuộc Nghĩa**. Tôi sẽ chỉ sửa số liệu khảo sát, mọi thay đổi về quyết định chọn/loại ứng viên xin qua Nghĩa.

---

## 5. Plan chi tiết phần tôi

### 5.1 · Thứ tự và phụ thuộc

```
B1 chốt đường dẫn
   └─> M1 source-manifest.ts      (không phụ thuộc contract)
         └─> M2 normalize.ts      (dùng SourceResolution)
               └─> M3 fixtures.ts (cần B2, B3 để đúng kiểu)
```

M1 và M2 làm được **ngay khi có B1** — không cần chờ Phase 0 đóng contract, vì cả hai chỉ phụ thuộc *input* contract đã có sẵn trong `workflow.md` §3.

### 5.2 · M1 — `source-manifest.ts`

Ánh xạ `day_code` → tài liệu chính thức. Điểm cốt lõi: **khai báo tường minh cái gì không map được**.

```ts
export interface SourceChunk {
  sourceId: string;        // "day02-slide-16" | "T01-045"
  kind: "slide" | "transcript";
  label: string;           // "Slide 16" | "[T01-045]"
  page?: number;
  title: string;
  excerpt: string;
}

export type SourceResolution =
  | { status: "mapped"; dayCode: string; sources: SourceChunk[] }
  | { status: "unmappable"; dayCode: string; reason: string };
```

Manifest tĩnh, khai báo 21 `day_code` có thật trong chatlog, trong đó:
- **6 mã** gọi tên Day 1/Day 2 → `mapped` (108 lượt, 8,6%)
- `New learning material` → `unmappable`, lý do "tên placeholder, không trỏ tài liệu nào" (397 lượt)
- 14 mã `Lecture_material_ms…` → `unmappable`, lý do "tài liệu không có trong data pack"

Test: mọi `day_code` trong chatlog đều resolve được (không ném lỗi) · không mã nào trả `mapped` với mảng rỗng · số lượt `mapped` đúng bằng 108.

### 5.3 · M2 — `normalize.ts`

Cổng duy nhất biến log thô thành `LearningTraceInput`. Cổng port thẳng từ `mine_chatlog.py` đã kiểm chứng.

```ts
export interface NormalizedInteraction {
  turnId: string;
  question: string;      // đã bỏ tiền tố "(Trang N, đoạn được chọn: …)"
  studentText: string;   // chỉ chữ học viên tự gõ — dùng để đọc signal
  page?: number;
  selection: string;     // đoạn tài liệu học viên bôi đen
  tutorAnswer: string;
  citations: number[];
  rating?: "up" | "down";
  flags: {
    isTemplateQuestion: boolean;   // 28,3% — không mang signal hiểu bài
    hasNoStudentWords: boolean;    // 28,2% — học viên không gõ gì
    repeatsPageInSession: boolean; // cận trên thô của signal "hỏi lại", chờ B6
  };
}
```

Ba lớp bóc text (bỏ tiền tố → bỏ câu template + nội dung trích → bỏ ngoặc kép còn lại) phải khớp **từng ký tự** với bản Python. Test sẽ so hai bản trên cùng 1.261 lượt.

Test: 8 case đơn vị cho hàm bóc text (port từ test Python) · lọc đúng theo `dayCode`/`conversationId` · **test đối chiếu chéo**: `studentText` của TS phải khớp 100% bản Python trên toàn bộ chatlog · lượt không thuộc học viên đang xem không bao giờ lọt vào output.

### 5.4 · M3 — `learning-trace-fixtures.ts`

Ba fixture, không phải một — để Đức có case cho cả ba nhánh và Đại demo được cả đường lỗi:

| Fixture | Nguồn | Nhánh minh hoạ |
|---|---|---|
| `day02Happy` | `U0323` × `day02-c301`, 4 lượt | Happy: có nguồn, có gap thật (`T0611` → `T0223`) |
| `thinSession` | phiên 1 lượt bất kỳ trong 292 phiên | Low-confidence: chỉ "đã tìm hiểu", gap rỗng |
| `unmappableSource` | phiên có `day_code = New learning material` | Failure: không sinh giải thích, báo thiếu nguồn |

Giữ đúng shape của `mockLearningTrace` để `LearningTraceApp.tsx` đổi nguồn dữ liệu mà không phải sửa component.

### 5.5 · Việc còn treo của phần evidence

- Đo **recall** cho quy tắc đếm "xin tóm tắt" (hiện mới có precision 96,7%) — cần mẫu ngẫu nhiên trên toàn bộ 1.261 lượt.
- ~~Tách signal "hỏi lại" thật từ 206 lượt cận trên~~ — xong, xem `b6-follow-up-signal.md`. Còn chờ Đức duyệt định nghĩa.

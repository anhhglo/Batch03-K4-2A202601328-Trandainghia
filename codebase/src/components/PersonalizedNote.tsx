"use client";

import {
  ArrowUpRight,
  BookMarked,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  RotateCcw,
} from "lucide-react";
import type {
  LearningDay,
  ReviewStatus,
} from "@/types/learning-trace";
import type { EvidenceDetail } from "@/components/EvidenceModal";

interface PersonalizedNoteProps {
  day: LearningDay;
  statuses: Record<string, ReviewStatus>;
  onSetStatus: (id: string, status: ReviewStatus) => void;
  onOpenEvidence: (detail: EvidenceDetail) => void;
}

export function PersonalizedNote({
  day,
  statuses,
  onSetStatus,
  onOpenEvidence,
}: PersonalizedNoteProps) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="explored-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2e5596]">
              Learning trace
            </p>
            <h2
              id="explored-heading"
              className="mt-1 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]"
            >
              Bạn đã tìm hiểu
            </h2>
          </div>
          <span className="rounded-full bg-[#edf3fb] px-3 py-1.5 text-xs font-bold text-[#2e5596]">
            {day.label} · {day.topics.length} chủ đề
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {day.topics.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-[#cfd9e6] bg-[#f9fbfd] p-4 text-sm leading-6 text-[#687790]">
              Chưa có chủ đề nào đủ căn cứ từ học liệu được cấp cho {day.label}.
              Lý do cụ thể nằm ở mục “Chưa đủ dữ liệu để kết luận” bên dưới.
            </p>
          ) : null}
          {day.topics.map((topic, index) => (
            <article
              key={topic.id}
              className="group rounded-[18px] border border-[#dfe6ef] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#c9d7e8] hover:shadow-[0_10px_30px_rgba(25,54,91,0.08)]"
            >
              <div className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#edf3fb] text-sm font-extrabold text-[#2e5596]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-[#10213d]">
                      {topic.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7f2] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#17775d]">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      {topic.learnedLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-[#596b85]">
                    {topic.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenEvidence({
                        eyebrow: "Nguồn học liệu",
                        title: topic.title,
                        description: topic.summary,
                        meta: `${topic.slide} · ${topic.transcript}`,
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-[#2e5596] transition-colors hover:text-[#1d3e73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                  >
                    {topic.slide} · {topic.transcript}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="review-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#b87514]">
              Gợi ý cần xác nhận · {day.label}
            </p>
            <h2
              id="review-heading"
              className="mt-1 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]"
            >
              Có thể cần xem lại
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#7a879b]">
            Bạn là người quyết định
          </span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {day.reviewItems.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-[#ead9ad] bg-[#fffdf7] p-4 text-sm leading-6 text-[#7d6a45] xl:col-span-2">
              Không có gợi ý ôn tập nào cho {day.label}. Đây là kết quả hợp lệ:
              hệ thống chỉ nêu gợi ý khi lượt chat có tín hiệu rõ ràng.
            </p>
          ) : null}
          {day.reviewItems.map((item) => {
            const status = statuses[item.id] ?? "suggested";
            const isConfirmed = status === "confirmed";
            const isReview = status === "review";

            return (
              <article
                key={item.id}
                className={`rounded-[18px] border p-5 transition-colors ${
                  isConfirmed
                    ? "border-[#b9dfd2] bg-[#f4fbf8]"
                    : isReview
                      ? "border-[#e9c475] bg-[#fffaf0]"
                      : "border-[#ead9ad] bg-[#fffdf7]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-[13px] ${
                      isConfirmed
                        ? "bg-[#dff3eb] text-[#17775d]"
                        : "bg-[#fff2ce] text-[#a66610]"
                    }`}
                  >
                    {isConfirmed ? (
                      <Check aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <CircleHelp aria-hidden="true" className="h-5 w-5" />
                    )}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] ${
                      isConfirmed
                        ? "bg-[#dff3eb] text-[#17775d]"
                        : isReview
                          ? "bg-[#f8e5b8] text-[#8d5a0d]"
                          : "bg-[#fff0ca] text-[#9b6412]"
                    }`}
                  >
                    {isConfirmed
                      ? "Đã xác nhận hiểu"
                      : isReview
                        ? "Đã lưu để ôn"
                        : item.confidenceLabel}
                  </span>
                </div>

                <h3 className="mt-4 font-extrabold leading-6 text-[#10213d]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#62718a]">
                  {item.reason}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenEvidence({
                        eyebrow: "Bằng chứng tương tác",
                        title: `Lượt hỏi ${item.evidenceTurnId}`,
                        description: item.reason,
                        meta: `${item.slide}${item.transcript ? ` · ${item.transcript}` : ""}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-bold text-[#2e5596] ring-1 ring-[#dbe4ef] transition-colors hover:bg-[#edf3fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                  >
                    Xem lượt hỏi {item.evidenceTurnId}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-semibold text-[#7a879b]">
                    {item.slide}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={() => onSetStatus(item.id, "confirmed")}
                    aria-pressed={isConfirmed}
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-extrabold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596] ${
                      isConfirmed
                        ? "bg-[#17775d] text-white shadow-sm"
                        : "border border-[#cdd9e7] bg-white text-[#2e5596] hover:border-[#2e5596] hover:bg-[#edf3fb]"
                    }`}
                  >
                    <Check aria-hidden="true" className="h-4 w-4" />
                    Mình đã hiểu
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetStatus(item.id, "review")}
                    aria-pressed={isReview}
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-extrabold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a66610] ${
                      isReview
                        ? "bg-[#a66610] text-white shadow-sm"
                        : "border border-[#ead9ad] bg-white text-[#8c5a13] hover:border-[#c99136] hover:bg-[#fff8e7]"
                    }`}
                  >
                    {isConfirmed ? (
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <BookMarked aria-hidden="true" className="h-4 w-4" />
                    )}
                    Cần xem lại
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-[16px] border border-[#dfe6ef] bg-[#f7f9fc] p-4">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#73829a]"
        />
        <div>
          <h3 className="text-sm font-extrabold text-[#253752]">
            Chưa đủ dữ liệu để kết luận
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#687790]">
            {day.unassessableNote}
          </p>
        </div>
      </section>
    </div>
  );
}

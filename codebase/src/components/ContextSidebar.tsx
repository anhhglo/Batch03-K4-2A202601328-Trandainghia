"use client";

import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import type { LearningDay } from "@/types/learning-trace";
import type { EvidenceDetail } from "@/components/EvidenceModal";

interface ContextSidebarProps {
  day: LearningDay;
  confirmedCount: number;
  onOpenEvidence: (detail: EvidenceDetail) => void;
}

export function ContextSidebar({
  day,
  confirmedCount,
  onOpenEvidence,
}: ContextSidebarProps) {
  return (
    <aside className="space-y-4" aria-label="Thông tin bổ sung">
      <section className="rounded-[18px] border border-[#dce4ee] bg-white p-5 shadow-[0_8px_24px_rgba(15,35,64,0.05)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3fb] text-[#2e5596]">
            <BookOpenCheck aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-[#10213d]">
              Nguồn & căn cứ
            </h2>
            <p className="text-[11px] text-[#8290a4]">
              Học liệu chính thức
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#64738b]">
          Mỗi giải thích được đối chiếu với học liệu chính thức.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {day.sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() =>
                onOpenEvidence({
                  eyebrow: "Nguồn học liệu",
                  title: source.title,
                  description: source.excerpt,
                  meta: source.label,
                })
              }
              className="rounded-lg border border-[#dce4ee] bg-[#f8fafc] px-2.5 py-1.5 text-[11px] font-bold text-[#2e5596] transition-colors hover:border-[#b9cbe0] hover:bg-[#edf3fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
            >
              {source.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#dce4ee] bg-white p-5 shadow-[0_8px_24px_rgba(15,35,64,0.05)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f4f8] text-[#405674]">
            <MessageSquareText
              aria-hidden="true"
              className="h-[18px] w-[18px]"
            />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-[#10213d]">
              Lịch sử hỏi AI
            </h2>
            <p className="text-[11px] text-[#8290a4]">
              {day.interactionCount} lượt trong {day.label}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {day.interactions.map((interaction) => (
            <button
              key={interaction.turnId}
              type="button"
              onClick={() =>
                onOpenEvidence({
                  eyebrow: "Lịch sử VLearn Tutor",
                  title: `${interaction.turnId} · ${interaction.page}`,
                  description: interaction.question,
                  meta: "Dữ liệu đã ẩn danh của phiên phân tích",
                })
              }
              className="group w-full rounded-[14px] border border-[#e4eaf1] bg-[#f8fafc] p-3 text-left transition-colors hover:border-[#cbd8e7] hover:bg-[#f2f6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
            >
              <span className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#7b899e]">
                {interaction.turnId} · {interaction.page}
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-[#2e5596] opacity-0 transition-opacity group-hover:opacity-100"
                />
              </span>
              <span className="mt-1.5 block text-xs font-semibold leading-5 text-[#344965]">
                “{interaction.question}”
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[#cfe2dc] bg-[#f3faf7] shadow-[0_8px_24px_rgba(15,35,64,0.04)]">
        <div className="border-b border-[#dcece7] bg-white/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#dff3eb] text-[#17775d]">
              <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-[#10213d]">
                Phản hồi của bạn
              </h2>
              <p className="text-[11px] text-[#72859a]">
                Cập nhật theo thời gian thực
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          {confirmedCount > 0 ? (
            <div className="flex items-start gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#17775d]"
              />
              <p className="text-sm leading-6 text-[#426457]">
                <strong className="text-[#17684f]">
                  {confirmedCount} gợi ý
                </strong>{" "}
                đã được bạn xác nhận là đã hiểu.
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[#667b71]">
              Hãy xác nhận một gợi ý để learning trace phản ánh đúng hơn việc
              học của bạn.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

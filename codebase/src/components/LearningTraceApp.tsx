"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  Network,
  NotebookTabs,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ContextSidebar } from "@/components/ContextSidebar";
import { DaySelector } from "@/components/DaySelector";
import {
  EvidenceModal,
  type EvidenceDetail,
} from "@/components/EvidenceModal";
import { Header } from "@/components/Header";
import { KnowledgeMindmap } from "@/components/KnowledgeMindmap";
import { MetricCard } from "@/components/MetricCard";
import { PersonalizedNote } from "@/components/PersonalizedNote";
import { mockLearningTrace } from "@/data/mock-learning-trace";
import {
  mapAnalysisToDay,
  mockDay02Analysis,
  mockDay02InteractionCount,
  mockDay02Shell,
  mockDay02Sources,
} from "@/lib/ui/learning-trace-adapter";
import type { LearningTrace, ReviewStatus } from "@/types/learning-trace";

type AppPhase = "preview" | "analyzing" | "ready" | "empty" | "error";
type ActiveTab = "note" | "mindmap";

export function LearningTraceApp() {
  const [phase, setPhase] = useState<AppPhase>("preview");
  const [trace, setTrace] = useState<LearningTrace>(mockLearningTrace);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("note");
  const [activeDayId, setActiveDayId] = useState("day-02");
  const [evidenceDetail, setEvidenceDetail] =
    useState<EvidenceDetail | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>(() =>
    Object.fromEntries(
      trace.days
        .flatMap((day) => day.reviewItems)
        .map((item) => [item.id, "suggested" as const]),
    ),
  );

  const activeDay =
    trace.days.find((day) => day.id === activeDayId) ?? trace.days[0];

  const confirmedCount = useMemo(
    () =>
      activeDay.reviewItems.filter(
        (item) => statuses[item.id] === "confirmed",
      ).length,
    [activeDay, statuses],
  );

  const reviewCount = activeDay.reviewItems.length - confirmedCount;

  const startAnalysis = () => {
    if (phase === "analyzing") return;
    setPhase("analyzing");
    setErrorMessage(null);
    // Phase 1: mock fixture stands in for the LLM analyzer response, but it
    // runs through the same mapAnalysisToDay() pipeline Phase 2's real
    // fetchLearningTraceAnalysis() result will go through.
    window.setTimeout(() => {
      try {
        const analyzedDay02 = mapAnalysisToDay(mockDay02Analysis, {
          shell: mockDay02Shell,
          sources: mockDay02Sources,
          interactionCount: mockDay02InteractionCount,
        });
        setTrace((current) => ({
          ...current,
          days: current.days.map((day) =>
            day.id === analyzedDay02.id ? analyzedDay02 : day,
          ),
        }));
        setPhase(
          analyzedDay02.topics.length === 0 &&
            analyzedDay02.reviewItems.length === 0
            ? "empty"
            : "ready",
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể tổng hợp Learning Trace.",
        );
        setPhase("error");
      }
    }, 1350);
  };

  const openStudyMaterial = () => {
    setEvidenceDetail({
      eyebrow: "Học liệu đang mở",
      title: `${activeDay.label} · ${activeDay.title}`,
      description:
        "Prototype CP2 mô phỏng liên kết quay lại slide và transcript chính thức của ngày học đang chọn.",
      meta: `${activeDay.slideCount} slide · ${activeDay.groundedSourceCount} nguồn đã đối chiếu`,
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0b1730]">
      <Header />

      <main id="main-content">
        <section className="border-b border-[#dce4ee] bg-white">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-7 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-10">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c83b3b]">
                {trace.session.eyebrow}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-[-0.04em] text-[#0b1730] sm:text-[38px]">
                  {trace.session.title}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3fb] px-3 py-1.5 text-xs font-bold text-[#2e5596]">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  Bản thử nghiệm CP2
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#687790]">
                {trace.session.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#405674]">
                  <BookOpenText aria-hidden="true" className="h-4 w-4 text-[#2e5596]" />
                  {trace.session.collectionLabel}
                </span>
                <span className="text-xs font-semibold text-[#8995a8]">
                  {trace.session.course}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:justify-end">
              <button
                type="button"
                onClick={openStudyMaterial}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#cfd9e6] bg-white px-5 text-sm font-extrabold text-[#365170] transition-all hover:border-[#aebfd3] hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
              >
                <BookOpen aria-hidden="true" className="h-[18px] w-[18px]" />
                Mở học liệu
              </button>
              {phase !== "ready" ? (
                <button
                  type="button"
                  onClick={startAnalysis}
                  disabled={phase === "analyzing"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2e5596] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(46,85,150,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#244a84] hover:shadow-[0_10px_24px_rgba(46,85,150,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {phase === "analyzing" ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  ) : (
                    <BrainCircuit aria-hidden="true" className="h-[18px] w-[18px]" />
                  )}
                  {phase === "analyzing"
                    ? "Đang tổng hợp..."
                    : "Xem Learning Trace"}
                  {phase === "preview" ? (
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  ) : null}
                </button>
              ) : (
                <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#eaf7f2] px-5 text-sm font-extrabold text-[#17775d]">
                  <CheckCircle2 aria-hidden="true" className="h-[18px] w-[18px]" />
                  Đã tổng hợp
                </span>
              )}
            </div>
          </div>
        </section>

        <div
          id="learning-trace"
          className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9"
        >
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Tổng quan buổi học"
          >
            <MetricCard
              icon={<MessageSquareText className="h-5 w-5" />}
              label="Lượt hỏi Tutor"
              value={activeDay.interactionCount}
              helper={activeDay.label}
            />
            <MetricCard
              icon={<NotebookTabs className="h-5 w-5" />}
              label="Chủ đề đã tìm hiểu"
              value={activeDay.topics.length}
              helper={activeDay.label}
              accent="green"
            />
            <MetricCard
              icon={<CircleAlert className="h-5 w-5" />}
              label="Gợi ý cần xem lại"
              value={reviewCount}
              helper={confirmedCount > 0 ? `${confirmedCount} đã hiểu` : "cần xác nhận"}
              accent="amber"
            />
            <MetricCard
              icon={<FileCheck2 className="h-5 w-5" />}
              label="Nguồn có căn cứ"
              value={activeDay.groundedSourceCount}
              helper={activeDay.label}
              accent="red"
            />
          </section>

          {phase === "preview" ? (
            <section
              className="mt-6 overflow-hidden rounded-[22px] border border-[#dce4ee] bg-white shadow-[0_12px_34px_rgba(15,35,64,0.06)]"
              aria-labelledby="preview-heading"
            >
              <div className="grid lg:grid-cols-[1fr_0.75fr]">
                <div className="relative min-h-[360px] overflow-hidden border-b border-[#e1e7ef] p-6 lg:border-b-0 lg:border-r">
                  <div className="pointer-events-none select-none opacity-45 blur-[2px]">
                    <div className="h-5 w-44 rounded-full bg-[#d8e3f0]" />
                    <div className="mt-6 grid gap-3">
                      {[75, 88, 62].map((width) => (
                        <div
                          key={width}
                          className="rounded-2xl border border-[#dce4ee] p-4"
                        >
                          <div
                            className="h-4 rounded-full bg-[#cddbea]"
                            style={{ width: `${width}%` }}
                          />
                          <div className="mt-3 h-3 w-full rounded-full bg-[#e5ebf2]" />
                          <div className="mt-2 h-3 w-2/3 rounded-full bg-[#e5ebf2]" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 grid place-items-center bg-white/35 p-6 backdrop-blur-[1px]">
                    <div className="max-w-sm rounded-[20px] border border-[#d9e3ee] bg-white p-6 text-center shadow-[0_18px_45px_rgba(24,50,83,0.14)]">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-[#edf3fb] text-[#2e5596]">
                        <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <h2
                        id="preview-heading"
                        className="mt-4 text-lg font-extrabold text-[#10213d]"
                      >
                        Learning Trace chưa được tạo
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#71809a]">
                        Tổng hợp lịch sử hỏi Tutor thành note và bản đồ kiến thức
                        trong vài giây.
                      </p>
                      <button
                        type="button"
                        onClick={startAnalysis}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e5596] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#244a84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                      >
                        <BrainCircuit aria-hidden="true" className="h-4 w-4" />
                        Xem Learning Trace
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex min-h-[260px] flex-col justify-center bg-[#f8fafc] p-6 sm:p-8">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#c83b3b]">
                    Bạn luôn kiểm soát
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]">
                    Gợi ý có căn cứ, không phải điểm số
                  </h2>
                  <div className="mt-5 space-y-4">
                    {[
                      {
                        icon: ShieldCheck,
                        title: "Không tự kết luận lỗ hổng",
                        copy: "Signal yếu được ghi rõ là chưa đủ dữ liệu.",
                      },
                      {
                        icon: FileCheck2,
                        title: "Truy về nguồn học liệu",
                        copy: "Mỗi giải thích đi cùng slide hoặc transcript.",
                      },
                      {
                        icon: CheckCircle2,
                        title: "Xác nhận và chỉnh sửa",
                        copy: "Phản hồi của bạn cập nhật cả note lẫn mindmap.",
                      },
                    ].map(({ icon: Icon, title, copy }) => (
                      <div key={title} className="flex gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#2e5596] ring-1 ring-[#dce4ee]">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#233651]">
                            {title}
                          </h3>
                          <p className="mt-0.5 text-xs leading-5 text-[#71809a]">
                            {copy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {phase === "analyzing" ? (
            <section
              className="mt-6 grid min-h-[420px] place-items-center rounded-[22px] border border-[#dce4ee] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,64,0.06)]"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="w-full max-w-md text-center">
                <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-[#edf3fb] text-[#2e5596]">
                  <BrainCircuit aria-hidden="true" className="h-7 w-7" />
                  <span className="absolute inset-0 animate-ping rounded-[20px] border border-[#89a7ce] opacity-30" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]">
                  Đang tổng hợp learning trace của bạn…
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#71809a]">
                  Đối chiếu lịch sử hỏi Tutor với học liệu chính thức
                </p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e8eef5]">
                  <span className="analysis-progress block h-full rounded-full bg-[#2e5596]" />
                </div>
                <div className="mt-4 flex items-center justify-center gap-5 text-[11px] font-bold text-[#8390a3]">
                  <span>{activeDay.interactionCount} lượt hỏi</span>
                  <span className="h-1 w-1 rounded-full bg-[#aab5c4]" />
                  <span>{activeDay.groundedSourceCount} nguồn</span>
                  <span className="h-1 w-1 rounded-full bg-[#aab5c4]" />
                  <span>{activeDay.topics.length} chủ đề</span>
                </div>
              </div>
            </section>
          ) : null}

          {phase === "error" ? (
            <section
              className="mt-6 grid min-h-[420px] place-items-center rounded-[22px] border border-[#f3c9c9] bg-[#fff7f7] p-6 shadow-[0_12px_34px_rgba(15,35,64,0.06)]"
              aria-live="assertive"
            >
              <div className="w-full max-w-md text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-[#fbe4e4] text-[#c83b3b]">
                  <AlertTriangle aria-hidden="true" className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]">
                  Không thể tổng hợp Learning Trace
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#71809a]">
                  {errorMessage ??
                    "Đã có lỗi khi tổng hợp dữ liệu. Vui lòng thử lại."}
                </p>
                <button
                  type="button"
                  onClick={startAnalysis}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e5596] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#244a84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  Thử lại
                </button>
              </div>
            </section>
          ) : null}

          {phase === "empty" ? (
            <section
              className="mt-6 grid min-h-[420px] place-items-center rounded-[22px] border border-[#dce4ee] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,64,0.06)]"
              aria-live="polite"
            >
              <div className="w-full max-w-md text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-[#edf3fb] text-[#2e5596]">
                  <Inbox aria-hidden="true" className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]">
                  Chưa đủ dữ liệu cho {activeDay.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#71809a]">
                  Không có chủ đề hoặc gợi ý ôn tập nào được tổng hợp từ lịch
                  sử hỏi Tutor của buổi học này.
                </p>
              </div>
            </section>
          ) : null}

          {phase === "ready" ? (
            <section className="mt-6">
              <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-[#cbdbea] bg-[#f6f9fd] p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#2e5596] shadow-sm ring-1 ring-[#dbe5ef]">
                  <ShieldCheck aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1b3558]">
                    Đây là gợi ý, không phải đánh giá năng lực
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#60728d]">
                    Kết quả dựa trên các câu hỏi của bạn trong buổi học. Bạn luôn
                    có thể xác nhận hoặc chỉnh sửa.
                  </p>
                </div>
              </div>

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-[22px] border border-[#dce4ee] bg-white shadow-[0_12px_34px_rgba(15,35,64,0.06)]">
                  <div className="flex border-b border-[#e1e7ef] bg-[#fafbfd] p-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("note")}
                      aria-selected={activeTab === "note"}
                      role="tab"
                      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-extrabold transition-all focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2e5596] ${
                        activeTab === "note"
                          ? "bg-white text-[#244d88] shadow-sm ring-1 ring-[#dde5ee]"
                          : "text-[#72809a] hover:text-[#244d88]"
                      }`}
                    >
                      <NotebookTabs aria-hidden="true" className="h-[18px] w-[18px]" />
                      Personalized Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("mindmap")}
                      aria-selected={activeTab === "mindmap"}
                      role="tab"
                      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-extrabold transition-all focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2e5596] ${
                        activeTab === "mindmap"
                          ? "bg-white text-[#244d88] shadow-sm ring-1 ring-[#dde5ee]"
                          : "text-[#72809a] hover:text-[#244d88]"
                      }`}
                    >
                      <Network aria-hidden="true" className="h-[18px] w-[18px]" />
                      Bản đồ kiến thức
                    </button>
                  </div>

                  <DaySelector
                    days={trace.days}
                    activeDayId={activeDay.id}
                    statuses={statuses}
                    onSelectDay={setActiveDayId}
                  />

                  <div
                    className="p-5 sm:p-6"
                    role="tabpanel"
                    aria-label={
                      activeTab === "note"
                        ? "Personalized Note"
                        : "Bản đồ kiến thức"
                    }
                  >
                    {activeTab === "note" ? (
                      <PersonalizedNote
                        day={activeDay}
                        statuses={statuses}
                        onSetStatus={(id, status) =>
                          setStatuses((current) => ({
                            ...current,
                            [id]: status,
                          }))
                        }
                        onOpenEvidence={setEvidenceDetail}
                      />
                    ) : (
                      <KnowledgeMindmap
                        day={activeDay}
                        statuses={statuses}
                      />
                    )}
                  </div>
                </div>

                <ContextSidebar
                  day={activeDay}
                  confirmedCount={confirmedCount}
                  onOpenEvidence={setEvidenceDetail}
                />
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-[#dce4ee] bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 py-5 text-xs text-[#7d8a9e] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>VLearn Learning Trace · Prototype CP2</span>
          <span>Dữ liệu minh họa · Không phải đánh giá năng lực học viên</span>
        </div>
      </footer>

      <EvidenceModal
        detail={evidenceDetail}
        onClose={() => setEvidenceDetail(null)}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  LockKeyhole,
  MessageSquareText,
  Network,
  NotebookTabs,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ContextSidebar } from "@/components/ContextSidebar";
import {
  EvidenceModal,
  type EvidenceDetail,
} from "@/components/EvidenceModal";
import { Header } from "@/components/Header";
import { KnowledgeMindmap } from "@/components/KnowledgeMindmap";
import { MetricCard } from "@/components/MetricCard";
import { PersonalizedNote } from "@/components/PersonalizedNote";
import { TutorSimulator } from "@/components/TutorSimulator";
import {
  createDemoDayShell,
  createDemoSources,
  createEmptyTrace,
  createSessionMeta,
  day02DemoInput,
} from "@/data/day02-demo";
import {
  analyzeTutorSession,
  TutorSimulatorApiError,
} from "@/lib/ui/tutor-simulator-api";
import {
  fetchLearningTraceAnalysis,
  LearningTraceApiError,
  mapAnalysisToDay,
  upsertAnalyzedDay,
} from "@/lib/ui/learning-trace-adapter";
import type { LearningTraceInput } from "@/lib/llm/learning-trace-contract";
import type { LearningTrace, ReviewStatus } from "@/types/learning-trace";

type AppPhase = "preview" | "analyzing" | "ready" | "error";
type ActiveTab = "note" | "mindmap";
type LastAnalysis =
  | { kind: "input"; input: LearningTraceInput }
  | { kind: "tutor-session"; conversationId: string };

export function LearningTraceApp() {
  const [phase, setPhase] = useState<AppPhase>("preview");
  const [trace, setTrace] = useState<LearningTrace>(createEmptyTrace);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("note");
  /** `null` shows the day cards grid; a day id opens that day's note/mindmap. */
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [evidenceDetail, setEvidenceDetail] =
    useState<EvidenceDetail | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<LastAnalysis>({
    kind: "input",
    input: day02DemoInput,
  });
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>({});

  const openDay = openDayId
    ? (trace.days.find((day) => day.id === openDayId) ?? null)
    : null;

  /** Metrics follow the open day, or summarise every analyzed day on the grid. */
  const scopedDays = useMemo(
    () => (openDay ? [openDay] : trace.days),
    [openDay, trace.days],
  );

  const scopedReviewItems = useMemo(
    () => scopedDays.flatMap((day) => day.reviewItems),
    [scopedDays],
  );

  const confirmedCount = useMemo(
    () =>
      scopedReviewItems.filter((item) => statuses[item.id] === "confirmed")
        .length,
    [scopedReviewItems, statuses],
  );

  const reviewCount = scopedReviewItems.length - confirmedCount;

  const scopedInteractionCount = scopedDays.reduce(
    (total, day) => total + day.interactionCount,
    0,
  );
  const scopedTopicCount = scopedDays.reduce(
    (total, day) => total + day.topics.length,
    0,
  );
  const scopedSourceCount = scopedDays.reduce(
    (total, day) => total + day.groundedSourceCount,
    0,
  );
  const scopeLabel = openDay
    ? openDay.label
    : trace.days.length === 0
      ? "chưa có ngày nào"
      : `${trace.days.length} ngày`;

  const applyAnalysis = (
    input: LearningTraceInput,
    analysis: Awaited<ReturnType<typeof fetchLearningTraceAnalysis>>,
    title?: string,
  ) => {
    const shell = {
      ...createDemoDayShell(input),
      ...(title ? { title } : {}),
    };
    const sources = createDemoSources(input);
    const analyzedDay = mapAnalysisToDay(analysis, {
      shell,
      sources,
      interactionCount: input.interactions.length,
    });

    // Each analyzed session becomes one day card on the grid.
    setTrace((current) => {
      const days = upsertAnalyzedDay(current.days, analyzedDay);
      return { session: createSessionMeta(days.length), days };
    });
    setStatuses((current) => {
      const next = { ...current };
      analyzedDay.reviewItems.forEach((item) => {
        next[item.id] ??= "suggested";
      });
      return next;
    });
    // Land on the grid so the learner picks a day card to open its note/mindmap.
    setOpenDayId(null);
    setPhase("ready");
    window.requestAnimationFrame(() => {
      document.getElementById("learning-trace")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const startAnalysis = async (input = day02DemoInput) => {
    if (phase === "analyzing") return;
    setPhase("analyzing");
    setErrorMessage(null);
    setLastAnalysis({ kind: "input", input });

    try {
      const analysis = await fetchLearningTraceAnalysis(input);
      applyAnalysis(input, analysis);
    } catch (error) {
      setErrorMessage(
        error instanceof LearningTraceApiError
          ? error.message
          : "Không thể tổng hợp Learning Trace. Vui lòng thử lại.",
      );
      setPhase("error");
    }
  };

  const startTutorSessionAnalysis = async (conversationId: string) => {
    if (phase === "analyzing") return;
    setPhase("analyzing");
    setErrorMessage(null);
    setLastAnalysis({ kind: "tutor-session", conversationId });
    try {
      const response = await analyzeTutorSession(conversationId);
      const displayInput: LearningTraceInput = {
        learnerId: "U-DEMO-TUTOR",
        conversationId: response.context.conversationId,
        dayCode: response.context.dayCode,
        interactions: response.context.interactions.map((interaction) => ({
          ...interaction,
          tutorAnswer: "",
        })),
        sources: response.context.sources,
      };
      applyAnalysis(displayInput, response.analysis, response.context.scenario.title);
    } catch (error) {
      setErrorMessage(
        error instanceof TutorSimulatorApiError
          ? error.message
          : "Không thể tổng hợp Learning Trace. Vui lòng thử lại.",
      );
      setPhase("error");
      window.requestAnimationFrame(() => {
        document.getElementById("learning-trace")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const retryAnalysis = () => {
    if (lastAnalysis.kind === "tutor-session") {
      return startTutorSessionAnalysis(lastAnalysis.conversationId);
    }
    return startAnalysis(lastAnalysis.input);
  };

  const openTutorSimulator = () => {
    document.getElementById("tutor-simulator")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openStudyMaterial = () => {
    const day = openDay ?? trace.days[0];
    setEvidenceDetail({
      eyebrow: "Học liệu đang mở",
      title: day ? `${day.label} · ${day.title}` : "Chưa có ngày nào được tổng hợp",
      description:
        "Demo chỉ hiển thị nguồn được cấp cho session hiện tại; Tutor answer không phải học liệu chính thức.",
      meta: day
        ? `${day.slideCount} slide · ${day.groundedSourceCount} nguồn đã đối chiếu`
        : "Hãy chat với AI Tutor rồi bấm Tạo Note & Mindmap.",
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0b1730]">
      <Header />

      <main id="main-content">
        <TutorSimulator
          isAnalyzing={phase === "analyzing"}
          analysisComplete={phase === "ready"}
          onAnalyze={startTutorSessionAnalysis}
        />
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
                  AI Tutor → Learning Trace
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
              <button
                type="button"
                onClick={openTutorSimulator}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2e5596] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(46,85,150,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#244a84] hover:shadow-[0_10px_24px_rgba(46,85,150,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
              >
                <BrainCircuit aria-hidden="true" className="h-[18px] w-[18px]" />
                Chat với AI Tutor
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
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
              value={scopedInteractionCount}
              helper={scopeLabel}
            />
            <MetricCard
              icon={<NotebookTabs className="h-5 w-5" />}
              label="Chủ đề đã tìm hiểu"
              value={scopedTopicCount}
              helper={scopeLabel}
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
              value={scopedSourceCount}
              helper={scopeLabel}
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
                        onClick={openTutorSimulator}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e5596] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#244a84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                      >
                        <BrainCircuit aria-hidden="true" className="h-4 w-4" />
                        Bắt đầu chat với Tutor
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
                  <span>{trace.days.length} ngày đã tổng hợp</span>
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
                  onClick={() => void retryAnalysis()}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e5596] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#244a84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  Thử lại
                </button>
              </div>
            </section>
          ) : null}

          {phase === "ready" && openDay === null ? (
            <section className="mt-6" aria-labelledby="day-cards-heading">
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

              <div className="overflow-hidden rounded-[22px] border border-[#dce4ee] bg-white shadow-[0_12px_34px_rgba(15,35,64,0.06)]">
                <div className="border-b border-[#e1e7ef] px-5 py-5 sm:px-6">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#c83b3b]">
                    Chọn ngày học
                  </p>
                  <h2
                    id="day-cards-heading"
                    className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-[#0b1730]"
                  >
                    Learning Trace được nhóm theo ngày
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#71809a]">
                    Bấm vào một thẻ ngày để mở Note và Bản đồ kiến thức của ngày
                    đó.
                  </p>
                </div>

                <div
                  className="grid gap-3 p-5 sm:px-6 lg:grid-cols-2 xl:grid-cols-3"
                  role="group"
                  aria-label="Danh sách ngày học"
                >
                  {trace.days.map((day) => {
                    const dayConfirmed = day.reviewItems.filter(
                      (item) => statuses[item.id] === "confirmed",
                    ).length;
                    const dayRemaining = day.reviewItems.length - dayConfirmed;

                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setActiveTab("note");
                          setOpenDayId(day.id);
                        }}
                        className="group flex min-h-[132px] items-center gap-4 rounded-[18px] border border-[#dce4ee] bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#b9cbe0] hover:shadow-[0_8px_20px_rgba(15,35,64,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
                      >
                        <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-[#f1f4f8] text-[#536784] transition-colors group-hover:bg-[#e4edf8] group-hover:text-[#214a84]">
                          <span className="text-center">
                            <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em]">
                              Day
                            </span>
                            <strong className="block text-[25px] leading-6 tracking-[-0.04em]">
                              {day.number}
                            </strong>
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <strong className="block text-base font-black text-[#10213d]">
                            {day.label}
                          </strong>
                          <span className="mt-1 block truncate text-xs font-semibold text-[#60728d]">
                            {day.title}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-[#8794a7]">
                            <span>{day.interactionCount} lượt hỏi</span>
                            <span aria-hidden="true">·</span>
                            <span>{day.topics.length} chủ đề</span>
                            <span aria-hidden="true">·</span>
                            {dayRemaining > 0 ? (
                              <span className="text-[#a66610]">
                                {dayRemaining} gợi ý cần xác nhận
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#17775d]">
                                <CheckCircle2
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                Không có gợi ý chờ
                              </span>
                            )}
                          </span>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2e5596]">
                            Xem note &amp; mindmap
                            <ArrowRight
                              aria-hidden="true"
                              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {phase === "ready" && openDay !== null ? (
            <section className="mt-6">
              <button
                type="button"
                onClick={() => setOpenDayId(null)}
                className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfd9e6] bg-white px-3.5 text-sm font-extrabold text-[#365170] transition-colors hover:bg-[#f7f9fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Tất cả ngày học
              </button>

              <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-[#cbdbea] bg-[#f6f9fd] p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#2e5596] shadow-sm ring-1 ring-[#dbe5ef]">
                  <ShieldCheck aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1b3558]">
                    {openDay.label} · {openDay.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#60728d]">
                    Đây là gợi ý, không phải đánh giá năng lực. Bạn luôn có thể
                    xác nhận hoặc chỉnh sửa.
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
                        day={openDay}
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
                        day={openDay}
                        statuses={statuses}
                      />
                    )}
                  </div>
                </div>

                <ContextSidebar
                  day={openDay}
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
          <span>VLearn Learning Trace · Demo AI thật</span>
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

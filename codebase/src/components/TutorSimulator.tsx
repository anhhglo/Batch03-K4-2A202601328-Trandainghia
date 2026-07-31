"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  BookOpenText,
  LoaderCircle,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import {
  fetchTutorScenarios,
  sendTutorMessage,
  TutorSimulatorApiError,
} from "@/lib/ui/tutor-simulator-api";
import type { TutorScenarioSummary } from "@/lib/tutor/types";

interface ChatMessage {
  id: string;
  role: "learner" | "tutor";
  content: string;
  turnId?: string;
  page?: string;
}

interface TutorSimulatorProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onAnalyze: (conversationId: string) => Promise<void>;
}

const DEMO_LEARNER_ID = "U-DEMO-TUTOR";

export function TutorSimulator({
  isAnalyzing,
  analysisComplete,
  onAnalyze,
}: TutorSimulatorProps) {
  const [scenarios, setScenarios] = useState<TutorScenarioSummary[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchTutorScenarios()
      .then((next) => {
        if (!active) return;
        setScenarios(next);
        setScenarioId((current) => current || next[0]?.id || "");
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof TutorSimulatorApiError
            ? error.message
            : "Không thể tải lesson demo.",
        );
      })
      .finally(() => {
        if (active) setIsLoadingScenarios(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === scenarioId),
    [scenarioId, scenarios],
  );

  const resetSession = () => {
    setConversationId(null);
    setMessages([]);
    setDraft("");
    setErrorMessage(null);
  };

  const selectScenario = (nextScenarioId: string) => {
    setScenarioId(nextScenarioId);
    resetSession();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !scenarioId || isSending || isAnalyzing) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      const response = await sendTutorMessage({
        scenarioId,
        learnerId: DEMO_LEARNER_ID,
        ...(conversationId ? { conversationId } : {}),
        message,
      });
      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `learner-${response.turn.turnId}`,
          role: "learner",
          content: response.turn.question,
          turnId: response.turn.turnId,
          page: response.turn.page,
        },
        {
          id: `tutor-${response.turn.turnId}`,
          role: "tutor",
          content: response.turn.answer,
          turnId: response.turn.turnId,
          page: response.turn.page,
        },
      ]);
      setDraft("");
    } catch (error) {
      setErrorMessage(
        error instanceof TutorSimulatorApiError
          ? error.message
          : "Tutor không thể trả lời lúc này. Vui lòng thử lại.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const analyze = async () => {
    if (!conversationId || isSending || isAnalyzing) return;
    setErrorMessage(null);
    try {
      await onAnalyze(conversationId);
    } catch (error) {
      setErrorMessage(
        error instanceof TutorSimulatorApiError
          ? error.message
          : "Không thể tổng hợp Learning Trace. Vui lòng thử lại.",
      );
    }
  };

  return (
    <section
      id="tutor-simulator"
      className="mx-auto mt-5 max-w-[1480px] px-4 sm:px-6 lg:px-8"
      aria-labelledby="tutor-simulator-heading"
    >
      <div className="overflow-hidden rounded-[22px] border border-[#cbdbea] bg-white shadow-[0_12px_34px_rgba(15,35,64,0.06)]">
        <div className="border-b border-[#dce4ee] bg-[#f6f9fd] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c83b3b]">
                Demo/dev · model thật
              </p>
              <h2 id="tutor-simulator-heading" className="mt-1 flex items-center gap-2 text-lg font-extrabold text-[#10213d]">
                <Bot aria-hidden="true" className="h-5 w-5 text-[#2e5596]" />
                AI Tutor Simulator
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#687790]">
                Chọn lesson, chat với Tutor, rồi tổng hợp chính session đó thành Note và Mindmap.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d6e2ef] bg-white px-3 py-2 text-[#45617f]">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#1f8a6b]" />
                Log Tutor là untrusted data
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d6e2ef] bg-white px-3 py-2 text-[#45617f]">
                <BookOpenText aria-hidden="true" className="h-3.5 w-3.5 text-[#2e5596]" />
                {selectedScenario?.sourceCount ?? 0} source được cấp
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)] sm:p-6">
          <aside className="space-y-4">
            <label className="grid gap-1.5 text-xs font-extrabold text-[#405674]">
              Lesson demo
              <select
                value={scenarioId}
                onChange={(event) => selectScenario(event.target.value)}
                disabled={isLoadingScenarios || isSending || isAnalyzing}
                className="rounded-xl border border-[#cfd9e6] bg-white px-3 py-2.5 text-sm font-semibold text-[#10213d] outline-none focus:border-[#2e5596] disabled:opacity-60"
              >
                {isLoadingScenarios ? <option>Đang tải…</option> : null}
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
                ))}
              </select>
            </label>
            {selectedScenario ? (
              <div className="rounded-xl border border-[#dce4ee] bg-[#fafbfd] p-3 text-xs leading-5 text-[#687790]">
                <p className="font-extrabold text-[#1b3558]">{selectedScenario.dayCode}</p>
                <p className="mt-1">{selectedScenario.description}</p>
                <p className="mt-2 font-semibold text-[#405674]">Server sẽ cấp turn ID, conversation ID và metadata từ lesson này.</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={resetSession}
              disabled={isSending || isAnalyzing || messages.length === 0}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#cfd9e6] bg-white px-3 text-xs font-extrabold text-[#405674] hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Tạo session mới
            </button>
          </aside>

          <div className="flex min-h-[340px] flex-col overflow-hidden rounded-[16px] border border-[#dce4ee] bg-[#fafbfd]">
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.length === 0 ? (
                <div className="grid min-h-[210px] place-items-center px-5 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-[#edf3fb] text-[#2e5596]">
                      <Bot aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-extrabold text-[#243955]">Bắt đầu bằng một câu hỏi về lesson đã chọn</p>
                    <p className="mt-1 text-xs leading-5 text-[#71809a]">Ví dụ: “{selectedScenario?.id === "day02-impact-effort" ? "Impact cao nhưng effort cũng cao thì nên làm gì?" : "Giải thích khái niệm này đơn giản hơn được không?"}”</p>
                  </div>
                </div>
              ) : messages.map((message) => (
                <article key={message.id} className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === "learner" ? "ml-auto bg-[#2e5596] text-white" : "border border-[#dce4ee] bg-white text-[#30445f]"}`}>
                  <p className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${message.role === "learner" ? "text-white/70" : "text-[#75859a]"}`}>{message.role === "learner" ? "Học viên" : "AI Tutor"}{message.turnId ? ` · ${message.turnId}` : ""}{message.page ? ` · trang ${message.page}` : ""}</p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                </article>
              ))}
              {isSending ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dce4ee] bg-white px-3.5 py-3 text-sm font-semibold text-[#687790]">
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#2e5596]" /> Tutor đang trả lời…
                </div>
              ) : null}
            </div>

            <form onSubmit={(event) => void submit(event)} className="border-t border-[#dce4ee] bg-white p-3">
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={!scenarioId || isSending || isAnalyzing}
                  maxLength={6_000}
                  placeholder="Nhập câu hỏi cho AI Tutor…"
                  className="min-w-0 flex-1 rounded-xl border border-[#cfd9e6] px-3 py-2.5 text-sm text-[#10213d] outline-none placeholder:text-[#98a4b5] focus:border-[#2e5596] disabled:bg-[#f6f8fb]"
                />
                <button type="submit" disabled={!draft.trim() || !scenarioId || isSending || isAnalyzing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2e5596] px-3.5 text-sm font-extrabold text-white hover:bg-[#244a84] disabled:cursor-not-allowed disabled:opacity-55">
                  <SendHorizontal aria-hidden="true" className="h-4 w-4" /> Gửi
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#dce4ee] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-3xl text-xs leading-5 text-[#687790]">Tutor answer là ngữ cảnh không tin cậy. Learning Trace chỉ tạo knowledge claim khi source được cấp đủ căn cứ.</p>
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={!conversationId || messages.length === 0 || isSending || isAnalyzing}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d73] px-4 text-sm font-extrabold text-white hover:bg-[#102f5b] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isAnalyzing ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <BrainCircuit aria-hidden="true" className="h-4 w-4" />}
            {isAnalyzing
              ? "Đang tổng hợp…"
              : analysisComplete
                ? "Tạo lại Note & Mindmap"
                : "Tạo Note & Mindmap"}
          </button>
        </div>
        {analysisComplete ? <p className="border-t border-[#c8e6da] bg-[#f2fbf7] px-5 py-3 text-sm font-semibold text-[#19775d]">Đã tổng hợp xong. Note và Mindmap nằm ngay bên dưới phần giới thiệu.</p> : null}
        {errorMessage ? <p role="alert" className="border-t border-[#f0c6c6] bg-[#fff7f7] px-5 py-3 text-sm font-semibold text-[#a33d3d]">{errorMessage}</p> : null}
      </div>
    </section>
  );
}

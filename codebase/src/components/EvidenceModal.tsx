"use client";

import { useEffect } from "react";
import { BookOpenText, X } from "lucide-react";

export interface EvidenceDetail {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
}

interface EvidenceModalProps {
  detail: EvidenceDetail | null;
  onClose: () => void;
}

export function EvidenceModal({ detail, onClose }: EvidenceModalProps) {
  useEffect(() => {
    if (!detail) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0b1730]/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        className="w-full max-w-lg rounded-[22px] border border-[#dce4ee] bg-white p-6 shadow-[0_28px_80px_rgba(11,23,48,0.22)]"
      >
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#edf3fb] text-[#2e5596]">
            <BookOpenText aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#c83b3b]">
              {detail.eyebrow}
            </p>
            <h2
              id="evidence-title"
              className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-[#0b1730]"
            >
              {detail.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#71809a] transition-colors hover:bg-[#f1f5f9] hover:text-[#0b1730] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e5596]"
            aria-label="Đóng chi tiết căn cứ"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-5 rounded-2xl border border-[#e1e8f0] bg-[#f7f9fc] p-4 text-sm leading-6 text-[#4f607b]">
          “{detail.description}”
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e5ebf2] pt-4">
          <span className="text-xs font-semibold text-[#7b899e]">
            {detail.meta}
          </span>
          <span className="rounded-full bg-[#eaf7f2] px-3 py-1.5 text-[11px] font-bold text-[#17775d]">
            Nguồn đã cấp
          </span>
        </div>
      </section>
    </div>
  );
}

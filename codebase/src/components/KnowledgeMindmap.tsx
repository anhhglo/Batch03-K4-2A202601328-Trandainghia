"use client";

import {
  CheckCircle2,
  CircleHelp,
  GitBranch,
  Lightbulb,
  Target,
  Workflow,
} from "lucide-react";
import {
  condenseToNodeText,
  MINDMAP_MAX_FALLBACK_NODES,
  splitIntoNodeText,
  stripParentContext,
} from "@/lib/ui/learning-trace-adapter";
import type {
  LearningDay,
  ReviewStatus,
  Topic,
} from "@/types/learning-trace";

interface KnowledgeMindmapProps {
  day: LearningDay;
  statuses: Record<string, ReviewStatus>;
}

const branchIcons = [Target, Workflow, Lightbulb];

interface SubBranch {
  id: string;
  title: string;
  detail: string;
}

/**
 * One node per key concept — never more.
 *
 * Key concepts are siblings, so they fan out under the topic instead of
 * chaining downward. Each carries its own condensed line inside the node
 * rather than spilling into a column of leaves: that spill is what shattered
 * the map into fragments, and the full wording already lives on the
 * Personalized Note tab.
 *
 * Node count therefore tracks how many distinct ideas the analyzer grounded,
 * which in practice lands near the number of things the learner asked about.
 */
function toSubBranches(topic: Topic): SubBranch[] {
  const keyConcepts = topic.keyConcepts ?? [];
  if (keyConcepts.length > 0) {
    return keyConcepts.map((concept) => ({
      id: concept.id,
      // The parent node already supplies the shared context; don't repeat it.
      title: condenseToNodeText(stripParentContext(concept.title, topic.title)),
      detail: condenseToNodeText(concept.summary),
    }));
  }

  // No key concepts: fall back to the topic summary, capped so a single long
  // summary cannot fan out into a wall of nodes.
  return splitIntoNodeText(topic.summary)
    .slice(0, MINDMAP_MAX_FALLBACK_NODES)
    .map((part, index) => ({
      id: `${topic.id}-summary-${index}`,
      title: part,
      detail: "",
    }));
}

export function KnowledgeMindmap({
  day,
  statuses,
}: KnowledgeMindmapProps) {
  const getReviewForTopic = (topic: Topic) =>
    day.reviewItems.find((item) => item.relatedTopicId === topic.id);

  return (
    <section aria-labelledby="mindmap-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2e5596]">
            Liên kết kiến thức · {day.label}
          </p>
          <h2
            id="mindmap-heading"
            className="mt-1 text-xl font-extrabold tracking-[-0.025em] text-[#0b1730]"
          >
            Bản đồ kiến thức
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#71809a]">
            Mindmap của {day.label} dùng chung dữ liệu và trạng thái xác nhận với
            Personalized Note.
          </p>
        </div>
        <span className="hidden rounded-full bg-[#edf3fb] px-3 py-1.5 text-xs font-bold text-[#2e5596] sm:inline-flex">
          {day.topics.length} nhánh chính
        </span>
      </div>

      {day.topics.length === 0 ? (
        <p className="mt-5 rounded-[20px] border border-dashed border-[#cfd9e6] bg-[#f8fbfe] p-5 text-sm leading-6 text-[#687790]">
          Chưa có nhánh kiến thức nào cho {day.label}. Bản đồ chỉ vẽ những chủ đề
          đã đối chiếu được với học liệu chính thức, nên khi chưa đủ căn cứ thì
          nó để trống thay vì suy đoán.
        </p>
      ) : null}

      <div
        className={`mindmap-canvas mt-5 rounded-[20px] border border-[#dce4ee] bg-[#f8fbfe] px-5 py-8 ${
          day.topics.length === 0 ? "hidden" : "hidden md:block"
        }`}
        // Cây toả ngang có thể rộng hơn khung; cho cuộn thay vì cắt mất nhánh.
        style={{ overflowX: "auto" }}
      >
        <div className="mindmap-root">
          <span className="mindmap-root-icon">
            <GitBranch aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <small>{day.label}</small>
            <strong>{day.title}</strong>
          </span>
        </div>

        <div
          className="mindmap-branches"
          style={{
            gridTemplateColumns: `repeat(${day.topics.length}, minmax(0, 1fr))`,
            // The horizontal rail must stop at the centre of the outer columns,
            // whatever the column count. Hardcoding it assumed three branches.
            ["--mindmap-rail-inset" as string]: `calc(100% / ${
              day.topics.length * 2
            })`,
          }}
        >
          {day.topics.map((topic, index) => {
            const Icon = branchIcons[index % branchIcons.length];
            const reviewItem = getReviewForTopic(topic);
            const reviewStatus = reviewItem
              ? (statuses[reviewItem.id] ?? "suggested")
              : null;
            const confirmed = reviewStatus === "confirmed";
            const needsReview = reviewStatus === "review";
            const subBranches = toSubBranches(topic);
            // Only a real review item or a grounded relationship earns a node.
            const statusNode = reviewItem?.title ?? topic.mindmapChild;

            return (
              <div className="mindmap-branch" key={topic.id}>
                <div
                  className={`mindmap-topic ${
                    index === 1
                      ? "mindmap-topic-red"
                      : "mindmap-topic-blue"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span>
                    <small>Chủ đề {String(index + 1).padStart(2, "0")}</small>
                    <strong>{topic.title}</strong>
                  </span>
                </div>

                {statusNode ? (
                  <div
                    className={`mindmap-child ${
                      reviewItem
                        ? confirmed
                          ? "mindmap-child-confirmed"
                          : "mindmap-child-review"
                        : "mindmap-child-neutral"
                    }`}
                    data-review-item={reviewItem?.id}
                  >
                    {reviewItem ? (
                      confirmed ? (
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <CircleHelp aria-hidden="true" className="h-4 w-4" />
                      )
                    ) : null}
                    <span>
                      {statusNode}
                      <small>
                        {reviewItem
                          ? confirmed
                            ? "Đã xác nhận"
                            : needsReview
                              ? "Đã lưu để ôn"
                              : "Cần xác nhận"
                          : "Liên kết có căn cứ"}
                      </small>
                    </span>
                  </div>
                ) : null}

                {subBranches.length > 0 ? (
                  <div
                    className="mindmap-subbranches"
                    style={{
                      gridTemplateColumns: `repeat(${subBranches.length}, minmax(0, 1fr))`,
                      ["--mindmap-rail-inset" as string]: `calc(100% / ${
                        subBranches.length * 2
                      })`,
                    }}
                  >
                    {subBranches.map((branch) => (
                      <div className="mindmap-subbranch" key={branch.id}>
                        <div className="mindmap-concept">
                          <strong>{branch.title}</strong>
                          {branch.detail ? <span>{branch.detail}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-5 grid gap-3 md:hidden"
        aria-label={`Bản đồ kiến thức ${day.label} dạng danh sách`}
      >
        {day.topics.map((topic) => {
          const reviewItem = getReviewForTopic(topic);
          const reviewStatus = reviewItem
            ? (statuses[reviewItem.id] ?? "suggested")
            : null;
          const confirmed = reviewStatus === "confirmed";

          return (
            <article
              key={topic.id}
              className="rounded-2xl border border-[#dce4ee] bg-white p-4"
            >
              <p className="text-sm font-extrabold text-[#10213d]">
                {topic.title}
              </p>
              {toSubBranches(topic).length > 0 ? (
                <ul className="mt-2.5 grid gap-2.5">
                  {toSubBranches(topic).map((branch) => (
                    <li
                      key={branch.id}
                      className="border-l-2 border-[#c8d8ea] pl-3"
                    >
                      <p className="text-xs font-extrabold text-[#243955]">
                        {branch.title}
                      </p>
                      {branch.detail ? (
                        <p className="mt-1 text-xs leading-5 text-[#71809a]">
                          {branch.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div
                className={`mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f4f7fb] px-3 py-2.5 ${
                  reviewItem || topic.mindmapChild ? "" : "hidden"
                }`}
              >
                <span className="text-sm text-[#566983]">
                  {reviewItem?.title ?? topic.mindmapChild}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    reviewItem && !confirmed
                      ? "bg-[#fff0ca] text-[#9b6412]"
                      : "bg-[#dff3eb] text-[#17775d]"
                  }`}
                >
                  {reviewItem
                    ? confirmed
                      ? "Đã xác nhận"
                      : "Cần xác nhận"
                    : "Đã tìm hiểu"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

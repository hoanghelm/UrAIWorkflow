import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Mentions,
  Tag,
  Markdown,
  TypingDots,
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  notify,
} from "@/components/ui";
import { api } from "@/lib/api";

const MODEL_MENTIONS = [
  { value: "opus", label: "opus" },
  { value: "sonnet", label: "sonnet" },
  { value: "haiku", label: "haiku" },
];

type Kind = "comment" | "approve" | "request_changes";

const MENTION = /@\w+/;

const KIND_TAG: Record<string, { label: string; color: string }> = {
  approve: { label: "approved", color: "green" },
  request_changes: { label: "requested changes", color: "gold" },
};

export function CardDiscussion({
  cardId,
  canReview,
  onReview,
}: {
  cardId: string;
  canReview: boolean;
  onReview: (state: "approved" | "changes_requested") => void;
}) {
  const qc = useQueryClient();
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["board-comments", cardId],
    queryFn: () => api.boardComments(cardId),
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  const remove = async (commentId: string) => {
    await api.deleteBoardComment(cardId, commentId);
    await refetch();
  };

  const post = async (kind: Kind) => {
    if (kind === "comment" && !body.trim()) {
      return;
    }
    const mentioned = kind === "request_changes" || (kind === "comment" && MENTION.test(body));
    setBusy(true);
    setAiPending(mentioned);
    try {
      await api.addBoardComment(cardId, { body, kind });
      setBody("");
      await refetch();
      if (kind === "approve") onReview("approved");
      if (kind === "request_changes") {
        onReview("changes_requested");
        void qc.invalidateQueries({ queryKey: ["runs"] });
      }
    } catch {
      notify.error("Could not post the comment.");
    } finally {
      setBusy(false);
      setAiPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 ? (
        <p className="text-sm text-faint">No discussion yet. Leave a note or verify the work.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const tag = KIND_TAG[c.kind];
            return (
              <div key={c.id} className="group flex gap-2">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] text-white ${
                    c.author === "ai" ? "bg-accent" : "bg-gray-500"
                  }`}
                >
                  {c.author === "ai" ? <RobotOutlined /> : "You"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-fg">
                      {c.author === "ai" ? "AI" : "You"}
                    </span>
                    {tag && <Tag color={tag.color}>{tag.label}</Tag>}
                    <span className="text-xs text-faint">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => remove(c.id)}
                      title="Delete comment"
                      className="ml-auto text-faint opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                  {c.body && (
                    <div className="text-sm text-fg">
                      <Markdown>{c.body}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aiPending && (
        <div className="flex gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] text-white">
            <RobotOutlined />
          </span>
          <div className="flex items-center pt-1 text-faint">
            <TypingDots />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <Mentions
          rows={2}
          value={body}
          onChange={(v) => setBody(v)}
          options={MODEL_MENTIONS}
          placeholder="Leave a comment. Type @ to mention a model to work on it"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="primary" size="small" loading={busy} onClick={() => post("comment")}>
            {MENTION.test(body) ? "Ask model" : "Comment"}
          </Button>
          {canReview && (
            <>
              <Button
                size="small"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => post("approve")}
                style={{ color: "#1e8657", borderColor: "#1e8657" }}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={busy}
                onClick={() => post("request_changes")}
              >
                Request changes
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

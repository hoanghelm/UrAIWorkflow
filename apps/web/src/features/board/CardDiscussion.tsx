import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  TextArea,
  Tag,
  Markdown,
  TypingDots,
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  notify,
} from "@/components/ui";
import { api } from "@/lib/api";

type Kind = "comment" | "approve" | "request_changes";

const MENTION = /@(model|ai)\b/i;

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
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["board-comments", cardId],
    queryFn: () => api.boardComments(cardId),
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  const post = async (kind: Kind) => {
    if (kind === "comment" && !body.trim()) {
      return;
    }
    const mentioned = kind === "comment" && MENTION.test(body);
    setBusy(true);
    setAiPending(mentioned);
    try {
      await api.addBoardComment(cardId, { body, kind });
      setBody("");
      await refetch();
      if (kind === "approve") onReview("approved");
      if (kind === "request_changes") onReview("changes_requested");
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
              <div key={c.id} className="flex gap-2">
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
        <TextArea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment mention @model to ask the AI to work on it"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="primary" size="small" loading={busy} onClick={() => post("comment")}>
            {MENTION.test(body) ? "Ask @model" : "Comment"}
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

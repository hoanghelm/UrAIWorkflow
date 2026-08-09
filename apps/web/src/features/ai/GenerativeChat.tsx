import { useEffect, useRef, useState } from "react";
import { Button, TextArea, Markdown, TypingDots, SendOutlined, notify } from "@/components/ui";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function GenerativeChat({
  context,
  setContext,
  contextPlaceholder,
  inputPlaceholder,
  emptyHint,
  starters = [],
  onSend,
}: {
  context: string;
  setContext: (v: string) => void;
  contextPlaceholder?: string;
  inputPlaceholder?: string;
  emptyHint: string;
  starters?: string[];
  onSend: (message: string, history: ChatTurn[]) => Promise<string>;
}) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = messages.slice(-8);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const summary = await onSend(q, history);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: summary };
        return next;
      });
    } catch {
      notify.error("The model could not build that. Activate a Claude connector and retry.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase text-faint">
          Context <span className="normal-case text-faint">(optional, sent with every message)</span>
        </div>
        <TextArea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={contextPlaceholder}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
      </div>

      <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{emptyHint}</p>
            {starters.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-md border border-line bg-surface-2 px-3 py-2 text-left text-sm text-muted hover:border-accent hover:text-fg"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="text-right">
                <div className="inline-block max-w-full whitespace-pre-wrap rounded-lg bg-accent px-3 py-2 text-sm text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg">
                {m.content ? (
                  <Markdown>{m.content}</Markdown>
                ) : busy && i === messages.length - 1 ? (
                  <span className="text-faint">
                    <TypingDots />
                  </span>
                ) : null}
              </div>
            ),
          )
        )}
      </div>

      <div className="flex items-end gap-2">
        <TextArea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={inputPlaceholder}
        />
        <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => send(input)} />
      </div>
    </div>
  );
}

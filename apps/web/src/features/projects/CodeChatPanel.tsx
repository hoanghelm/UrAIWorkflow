import { useEffect, useRef, useState } from "react";
import { Button, TextArea, Markdown, TypingDots, SendOutlined, RobotOutlined, CloseOutlined, notify } from "@/components/ui";
import { api } from "@/lib/api";
import { onRunDelta } from "@/lib/ws";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function CodeChatPanel({
  projectId,
  focus,
  files,
  outline,
  onClose,
}: {
  projectId: string;
  focus: string | null;
  files: string[];
  outline: string[];
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = onRunDelta((d) => {
      if (d.runId !== streamRef.current) return;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = { ...last, content: last.content + d.text };
        }
        return next;
      });
    });
    return off;
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const history = messages.slice(-6);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    const streamId = crypto.randomUUID();
    streamRef.current = streamId;
    try {
      const { text } = await api.explainCode(projectId, {
        streamId,
        question: q,
        focus: focus ?? undefined,
        files: focus ? files.slice(0, 10) : [],
        outline: outline.slice(0, 400),
        history,
      });
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: text || next[next.length - 1].content };
        return next;
      });
    } catch {
      notify.error("The model could not answer. Activate a Claude connector and retry.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
      streamRef.current = null;
    }
  };

  return (
    <div className="flex w-96 shrink-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <RobotOutlined className="text-accent" />
        <span className="text-sm font-semibold text-fg">Ask about the code</span>
        <button onClick={onClose} className="ml-auto text-faint hover:text-fg">
          <CloseOutlined />
        </button>
      </div>

      <div className="border-b border-line px-3 py-2 text-xs text-faint">
        {focus ? (
          <>
            Context: <span className="font-mono text-muted">{focus.split("/").pop()}</span> + {Math.min(files.length, 10) - 1} related file{files.length === 2 ? "" : "s"}
          </>
        ) : (
          "Focus a node in the graph to ground answers in specific files."
        )}
      </div>

      <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: "48vh" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Ask what a file or flow does, how modules connect, or the domain logic behind an area.
            </p>
            {focus && (
              <Button
                size="small"
                onClick={() => ask("Explain the domain and business logic of this flow, and how these files work together.")}
              >
                Explain this flow
              </Button>
            )}
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

      <div className="flex items-end gap-2 border-t border-line p-2">
        <TextArea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          placeholder="Ask about this code"
        />
        <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => ask(input)} />
      </div>
    </div>
  );
}

import { useState } from "react";
import type { ConnectorUsage } from "@vcc-workflow/schema";
import { Drawer, Tag, Empty, Spin, Progress, FundOutlined } from "@/components/ui";
import { api, type Headroom } from "@/lib/api";

const TIERS: Array<{ key: "opus" | "sonnet" | "haiku"; label: string }> = [
  { key: "opus", label: "Opus" },
  { key: "sonnet", label: "Sonnet" },
  { key: "haiku", label: "Haiku" },
];

const LEVER_LABEL: Record<string, string> = {
  cache: "Prompt cache",
  rtk: "RTK (output compression)",
  codegraph: "CodeGraph (structural queries)",
};

export function UsageWidget() {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<ConnectorUsage | null>(null);
  const [headroom, setHeadroom] = useState<Headroom | null>(null);
  const [loading, setLoading] = useState(false);

  const openPanel = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const [u, h] = await Promise.all([api.connectorUsage(), api.headroom()]);
      setUsage(u);
      setHeadroom(h);
    } finally {
      setLoading(false);
    }
  };

  const tokensFor = (modelId: string) =>
    usage?.byModel.find((m) => m.model === modelId)?.tokens ?? 0;

  const tierModelIds = new Set(usage?.models ? Object.values(usage.models) : []);
  const otherModels = (usage?.byModel ?? []).filter((m) => !tierModelIds.has(m.model));

  return (
    <>
      <button
        onClick={openPanel}
        className="flex h-full items-center gap-1.5 px-2.5 transition-colors hover:bg-white/15"
      >
        <FundOutlined />
        <span>Usage</span>
      </button>
      <Drawer
        title="Models & token usage"
        placement="right"
        width={400}
        open={open}
        onClose={() => setOpen(false)}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : !usage ? (
          <Empty description="No usage yet" />
        ) : (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
              <span className="text-sm font-medium text-fg">
                {usage.account ? usage.account.name : "No active account"}
              </span>
              {usage.account ? (
                <Tag color={usage.account.provider === "claude-agent" ? "green" : "gold"}>
                  {usage.account.provider === "claude-agent" ? "Subscription" : "API key"}
                </Tag>
              ) : (
                <Tag>Stub agent</Tag>
              )}
            </div>

            {usage.models && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-faint">
                  Available models
                </div>
                <div className="flex flex-col gap-1.5">
                  {TIERS.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Tag color="blue">{t.label}</Tag>
                        <span className="font-mono text-xs text-muted">
                          {usage.models![t.key]}
                        </span>
                      </span>
                      <span className="tabular-nums text-fg">
                        {tokensFor(usage.models![t.key]).toLocaleString()} tok
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherModels.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-faint">Other models</div>
                <div className="flex flex-col gap-1.5">
                  {otherModels.map((m) => (
                    <div key={m.model} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted">{m.model}</span>
                      <span className="tabular-nums text-fg">{m.tokens.toLocaleString()} tok</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <div className="text-xs text-faint">Total consumed</div>
                <div className="text-lg font-semibold tabular-nums text-fg">
                  {usage.totalConsumed.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-faint">Total saved</div>
                <div className="text-lg font-semibold tabular-nums text-accent">
                  {usage.totalSaved.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-faint">Saved from</div>
              {Object.keys(usage.byLever ?? {}).length === 0 ? (
                <p className="text-xs text-faint">
                  No token savings recorded yet. Prompt caching kicks in on repeated context.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {Object.entries(usage.byLever).map(([source, tokens]) => (
                    <div key={source} className="flex items-center justify-between text-sm">
                      <span className="text-fg">{LEVER_LABEL[source] ?? source}</span>
                      <span className="tabular-nums font-medium text-accent">
                        {tokens.toLocaleString()} tok
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-faint">
                Tools that measure their own gain (RTK, CodeGraph) appear here once they run and report it.
                Prompt directives (Caveman, Ponytail, Disclosure) have no before/after baseline, so they
                aren&apos;t counted.
              </p>
            </div>

            {headroom && (
              <div className="border-t border-line pt-3">
                <div className="mb-2 text-xs font-semibold uppercase text-faint">
                  Rate headroom (live)
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="text-muted">Requests</span>
                      <span className="tabular-nums text-fg">
                        {headroom.requests}/{headroom.maxRequests} · {headroom.requestHeadroom} left
                      </span>
                    </div>
                    <Progress
                      percent={headroom.maxRequests ? Math.round((headroom.requests / headroom.maxRequests) * 100) : 0}
                      strokeColor="#E8734A"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="text-muted">Tokens / min</span>
                      <span className="tabular-nums text-fg">
                        {headroom.tokens.toLocaleString()}/{headroom.maxTokens.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      percent={headroom.maxTokens ? Math.round((headroom.tokens / headroom.maxTokens) * 100) : 0}
                      strokeColor="#E8734A"
                      showInfo={false}
                    />
                  </div>
                  <div className="text-[11px] text-faint">
                    Sliding {Math.round(headroom.windowMs / 1000)}s window · {headroom.waiting} call(s) waiting for capacity.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

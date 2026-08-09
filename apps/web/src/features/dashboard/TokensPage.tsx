import {
  Card,
  Empty,
  PageHeader,
  Progress,
  RunStatusPill,
  Statistic,
  Table,
  FundOutlined,
  type Columns,
} from "@/components/ui";
import type { RunRow } from "@/lib/api";
import { useTokens } from "./useTokens";

const LEVER_LABEL: Record<string, string> = {
  cache: "Prompt cache",
  codegraph: "CodeGraph",
  rtk: "RTK",
  ponytail: "Ponytail",
  caveman: "Caveman",
  routing: "Routing",
  disclosure: "Disclosure",
};

const runColumns: Columns<RunRow> = [
  { title: "Run", dataIndex: "name", key: "name" },
  { title: "Pack", dataIndex: "pack", key: "pack" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (v: string) => <RunStatusPill status={v} />,
  },
  {
    title: "Consumed",
    dataIndex: "tokensConsumed",
    key: "tokensConsumed",
    align: "right",
    render: (v: number) => v.toLocaleString(),
  },
  {
    title: "Cached",
    dataIndex: "tokensSaved",
    key: "tokensSaved",
    align: "right",
    render: (v: number) => (
      <span className="font-medium text-emerald-600">{v.toLocaleString()}</span>
    ),
  },
];

export function TokensPage() {
  const { hasProject, summary, runs, headroom } = useTokens();

  if (!hasProject) {
    return (
      <div>
        <PageHeader icon={<FundOutlined />} title="Tokens" subtitle="Consumption and savings." />
        <Empty description="Select a project to see its token consumption and savings" />
      </div>
    );
  }

  const consumed = summary?.tokensConsumed ?? 0;
  const input = summary?.tokensInput ?? 0;
  const output = summary?.tokensOutput ?? 0;
  const cached = summary?.tokensCached ?? 0;
  const byLever = summary?.byLever ?? {};
  const cacheBaseline = input + cached;
  const cachePct = cacheBaseline > 0 ? Math.round((cached / cacheBaseline) * 100) : 0;

  const reqPct = headroom && headroom.maxRequests > 0 ? Math.round((headroom.requests / headroom.maxRequests) * 100) : 0;
  const tokPct = headroom && headroom.maxTokens > 0 ? Math.round((headroom.tokens / headroom.maxTokens) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<FundOutlined />}
        title="Tokens"
        subtitle="Real usage from the model's own token counts, not estimates."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <Statistic title="Tokens consumed" value={consumed} />
          <div className="mt-1 font-mono text-xs text-faint">
            {input.toLocaleString()} in · {output.toLocaleString()} out
          </div>
        </Card>
        <Card>
          <Statistic title="Cached (prompt cache)" value={cached} valueStyle={{ color: "#1E8657" }} />
          <div className="mt-1 text-xs text-faint">
            Input tokens served from cache, a real saving the model reports.
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <Progress type="dashboard" percent={cachePct} size={92} format={(p) => `${p ?? 0}%`} strokeColor="#1E8657" />
            <div>
              <div className="text-xs uppercase text-faint">Cache hit rate</div>
              <div className="text-sm text-muted">
                {cachePct}% of input tokens came from the prompt cache.
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Saved tokens by source">
        {Object.keys(byLever).length === 0 ? (
          <Empty description="No token savings recorded yet. Prompt caching kicks in on repeated context." />
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(byLever).map(([source, value]) => {
              const pct = cached > 0 ? Math.round((Number(value) / cached) * 100) : 0;
              return (
                <div key={source} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium">{LEVER_LABEL[source] ?? source}</div>
                  <div className="flex-1">
                    <Progress percent={pct} strokeColor="#1E8657" showInfo={false} />
                  </div>
                  <div className="w-32 text-right font-mono text-sm">
                    {Number(value).toLocaleString()} tok
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Rate headroom (live)">
        {!headroom ? (
          <Empty description="Headroom unavailable." />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="w-28 text-sm font-medium">Requests</div>
              <div className="flex-1">
                <Progress percent={reqPct} strokeColor="#E8734A" showInfo={false} />
              </div>
              <div className="w-40 text-right font-mono text-sm">
                {headroom.requests}/{headroom.maxRequests} · {headroom.requestHeadroom} left
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 text-sm font-medium">Tokens/min</div>
              <div className="flex-1">
                <Progress percent={tokPct} strokeColor="#E8734A" showInfo={false} />
              </div>
              <div className="w-40 text-right font-mono text-sm">
                {headroom.tokens.toLocaleString()}/{headroom.maxTokens.toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-faint">
              Sliding {Math.round(headroom.windowMs / 1000)}s window · {headroom.waiting} call(s) waiting for capacity.
            </div>
          </div>
        )}
      </Card>

      <Card title="Efficiency levers (qualitative)">
        <p className="mb-2 text-sm text-muted">
          These shape how the model works to reduce tokens, but their exact per-run saving isn't
          separately measurable, so no number is shown. Only cache reads above are a directly measured saving.
        </p>
        <div className="flex flex-wrap gap-2">
          {["caveman", "ponytail", "disclosure", "routing", "codegraph", "rtk"].map((l) => (
            <span key={l} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
              {LEVER_LABEL[l] ?? l}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Runs">
        <Table<RunRow> rowKey="id" columns={runColumns} dataSource={runs} pagination={false} />
      </Card>
    </div>
  );
}

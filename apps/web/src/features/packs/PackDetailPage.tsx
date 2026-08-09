import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Collapse,
  Tag,
  Empty,
  Spin,
  notify,
  ArrowLeftOutlined,
  ThunderboltOutlined,
  PartitionOutlined,
  CopyOutlined,
} from "@/components/ui";
import { usePackQuery } from "@/lib/queries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { roleMeta } from "./roleMeta";

const MODEL_COLOR: Record<string, string> = {
  opus: "#E8734A",
  sonnet: "#0EA5E9",
  haiku: "#10B981",
  inherit: "#8892A6",
};

export function PackDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentId = useAppSelector((s) => s.projects.currentId);
  const { data: pack, isLoading } = usePackQuery(name);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin />
      </div>
    );
  }
  if (!pack) {
    return <Empty description="Pack not found." />;
  }

  const run = async () => {
    if (!currentId) {
      notify.error("Select a workspace first.");
      return;
    }
    const created = await dispatch.runs.start({ projectId: currentId, pack: pack.name, inputs: {} });
    notify.success("Run started");
    navigate(`/runs/${created.id}`);
  };

  const stepItems = pack.stages.map((s, i) => ({
    key: s.id,
    label: (
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-faint">{i + 1}</span>
        <span className="font-medium">{s.title || s.id}</span>
      </span>
    ),
    extra: (
      <span className="flex items-center gap-1">
        {s.verify && <Tag>verify: {s.verify}</Tag>}
        {s.gate && <Tag color="gold">approval</Tag>}
        <Tag color={MODEL_COLOR[s.model] ?? "#8892A6"}>{s.model}</Tag>
      </span>
    ),
    children: (
      <div className="flex flex-col gap-3 text-sm">
        {s.description && <p className="text-muted">{s.description}</p>}
        {s.instruction && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-faint">Instruction to the AI</div>
            <p className="whitespace-pre-wrap text-fg">{s.instruction}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          <Tag>agent: {s.agent}</Tag>
          {s.skills.map((k) => (
            <Tag key={k} color="geekblue">
              {k}
            </Tag>
          ))}
          {s.tools.map((t) => (
            <Tag key={t} color="cyan">
              {t}
            </Tag>
          ))}
        </div>
      </div>
    ),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <button
        onClick={() => navigate("/packs")}
        className="flex w-max items-center gap-1 text-sm text-faint hover:text-fg"
      >
        <ArrowLeftOutlined /> Packs
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-fg">{pack.title || pack.name}</h1>
            <Tag color={pack.trust === "verified" ? "green" : "default"}>{pack.trust}</Tag>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="mr-1 font-mono text-xs text-faint">{pack.name}</span>
            {pack.roles.map((r) => (
              <Tag key={r} color={roleMeta(r).color}>
                {roleMeta(r).label}
              </Tag>
            ))}
            {pack.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted">{pack.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={run}>
            Run
          </Button>
          <Button
            icon={<PartitionOutlined />}
            onClick={() => navigate(`/build?pack=${pack.name}&mode=view`)}
          >
            Open in Build
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => navigate(`/build?pack=${pack.name}&mode=edit`)}
          >
            Duplicate
          </Button>
        </div>
      </div>

      <Card title={`Steps (${pack.stages.length})`} styles={{ body: { padding: 8 } }}>
        <Collapse items={stepItems} defaultActiveKey={pack.stages[0] ? [pack.stages[0].id] : []} />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Levers">
          <div className="flex flex-wrap gap-2">
            {pack.levers.length === 0 ? (
              <span className="text-sm text-faint">none</span>
            ) : (
              pack.levers.map((l) => <Tag key={l}>{l}</Tag>)
            )}
          </div>
        </Card>
        <Card title="Guardrails">
          <div className="flex flex-col gap-1 font-mono text-xs text-muted">
            <div>max retries: {pack.guardrails.maxRetries}</div>
            <div>max loop depth: {pack.guardrails.maxLoopDepth}</div>
            <div>budget: {(pack.guardrails.budget.tokens ?? 0).toLocaleString()} tokens</div>
            <div>on breach: {pack.guardrails.onBreach}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

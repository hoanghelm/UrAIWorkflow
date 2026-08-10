import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard } from "@vcc-workflow/schema";
import {
  Button,
  Tag,
  RunStatusPill,
  ThunderboltOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@/components/ui";
import { TYPE_META } from "./itemMeta";

const STAGE_DOT: Record<string, string> = {
  todo: "#9aa3b2",
  in_process: "#2a6dac",
  review: "#c08a2d",
  completed: "#1e8657",
  closed: "#bb3b37",
};

export function SortableCard({
  card,
  runStatus,
  childCount,
  subStages = [],
  onRun,
  onDelete,
  onOpenDetail,
}: {
  card: BoardCard;
  runStatus?: string;
  childCount: number;
  subStages?: BoardCard[];
  onRun: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpenDetail}
      className="cursor-grab rounded-lg border border-line bg-surface p-3 shadow-sm transition hover:border-accent active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {runStatus === "running" && <LoadingOutlined spin className="shrink-0 text-accent" />}
          <Tag color={TYPE_META[card.type].color} className="shrink-0">
            {TYPE_META[card.type].label}
          </Tag>
          <span className="truncate text-sm font-medium">{card.title}</span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 text-faint hover:text-err"
        >
          <DeleteOutlined />
        </button>
      </div>
      {card.requirement && (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{card.requirement}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Tag>{card.pack}</Tag>
        <Tag color="blue">{card.model}</Tag>
        <Tag>×{card.maxLoops} loops</Tag>
      </div>
      {subStages.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 rounded-md border border-line bg-surface-2/60 p-1.5">
          {subStages.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs">
              {s.status === "in_process" && runStatus === "running" ? (
                <LoadingOutlined spin className="text-accent" />
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: STAGE_DOT[s.status] ?? "#9aa3b2" }}
                />
              )}
              <span className="truncate text-fg">{s.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        {childCount > 0 ? (
          <span className="text-xs text-faint">
            {childCount} sub-item{childCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span />
        )}
        {runStatus ? (
          <RunStatusPill status={runStatus} />
        ) : (
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
          >
            Run
          </Button>
        )}
      </div>
    </div>
  );
}

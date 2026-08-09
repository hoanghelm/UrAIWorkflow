import type { ReactNode } from "react";

export function PageHeader({
  icon,
  title,
  subtitle,
  extra,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {icon && (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "#E8734A" }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xl font-semibold tracking-tight">{title}</div>
        {subtitle && <div className="text-sm text-faint">{subtitle}</div>}
      </div>
      {extra}
    </div>
  );
}

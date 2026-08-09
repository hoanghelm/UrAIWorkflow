type PlaceholderProps = {
  label: string;
  aspect?: string;
  className?: string;
};

export function Placeholder({ label, aspect = "aspect-[4/3]", className = "" }: PlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex w-full items-center justify-center rounded-lg bg-blue-100 text-p3 text-navy-900/60 ${aspect} ${className}`}
    >
      {label}
    </div>
  );
}

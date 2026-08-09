import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "accent" | "outline";
type ButtonRadius = "sm" | "md";

type ButtonProps = PropsWithChildren<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    variant?: ButtonVariant;
    radius?: ButtonRadius;
    arrow?: boolean;
    href?: string;
    className?: string;
  }
>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-500 text-white hover:bg-blue-500/90 active:translate-y-px",
  accent:
    "bg-yellow-300 text-navy-900 hover:bg-yellow-300/90 active:translate-y-px",
  outline:
    "bg-white text-ink-900 border border-yellow-300 hover:shadow-price active:translate-y-px",
};

export function Button({
  variant = "primary",
  radius = "md",
  arrow = false,
  href,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-p2-med transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005FCC] disabled:pointer-events-none disabled:opacity-50 ${radius === "sm" ? "rounded-sm" : "rounded-md"} ${variantClasses[variant]} ${className}`;

  const content = (
    <>
      {children}
      {arrow && (
        <img src="/assets/arrow-sm.svg" alt="" aria-hidden="true" className="h-[11px] w-[11px]" />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" disabled={disabled} className={classes} {...rest}>
      {content}
    </button>
  );
}

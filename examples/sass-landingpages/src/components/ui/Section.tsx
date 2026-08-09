import type { PropsWithChildren } from "react";
import { Container } from "./Container";

type SectionProps = PropsWithChildren<{
  bg?: "navy" | "white";
  tightBottom?: boolean;
  className?: string;
  as?: "section" | "header" | "footer";
}>;

export function Section({
  bg = "white",
  tightBottom = false,
  className = "",
  as: Tag = "section",
  children,
}: SectionProps) {
  return (
    <Tag
      className={`relative w-full overflow-hidden ${bg === "navy" ? "bg-navy-900" : "bg-white"} ${className}`}
    >
      <Container>
        <div
          className={`py-10 sm:py-16 lg:py-[140px] ${tightBottom ? "lg:pb-8" : ""}`}
        >
          {children}
        </div>
      </Container>
    </Tag>
  );
}

import type { PropsWithChildren } from "react";

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 sm:px-10 lg:px-[220px]">
      {children}
    </div>
  );
}

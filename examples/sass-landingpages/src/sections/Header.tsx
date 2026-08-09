import { useState } from "react";
import { Container, Button } from "@/components/ui";

const navItems = ["Products", "Solutions", "Resources", "Pricing"];

function NavItem({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="flex items-center gap-2 font-nav text-nav font-medium text-white hover:opacity-80"
    >
      {label}
      <img
        src="/assets/chevron-down.svg"
        alt=""
        aria-hidden="true"
        className={`h-[5px] w-[10px] transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export function Header() {
  return (
    <header className="w-full bg-navy-900">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <a href="/" className="flex items-center gap-[10px]">
            <img src="/assets/logo-icon.svg" alt="" aria-hidden="true" className="h-[29px] w-[37px]" />
            <span className="text-h5 font-bold text-white">whitepace</span>
          </a>

          <nav aria-label="Primary" className="flex flex-wrap items-center gap-8">
            {navItems.map((item) => (
              <NavItem key={item} label={item} />
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <Button variant="accent" className="px-10 py-4">
              Login
            </Button>
            <Button variant="primary" arrow className="px-6 py-4">
              Try Whitepace free
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}

# Frontend rules (apps/web)

- **Wrap before use.** No feature or page imports `antd`, `@xyflow/react`, or any component library directly. Wrappers live in `src/components/ui/*` and are the only place third-party UI is imported. Consume via the `@/components/ui` barrel.
- State is Rematch. Models live in `src/store/models/*`; components read via typed hooks from `src/store/hooks.ts`. No ad-hoc context stores.
- API access goes through `src/lib/api.ts`; realtime through `src/lib/ws.ts`. Components never call `fetch`/`axios`/`io` directly.
- Types come from `@vcc-workflow/schema`. Do not restate server shapes in the client beyond the thin row DTOs in `src/lib/api.ts`.
- Tailwind for layout and spacing; AntD (wrapped) for components. Tailwind preflight is disabled to avoid clobbering AntD resets.
- No code comments.

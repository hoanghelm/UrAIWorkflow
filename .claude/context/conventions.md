# Conventions

## Everywhere
- TypeScript, strict. No code comments — names and types carry meaning.
- Shared shapes live in `@vcc-workflow/schema`. Do not restate them.
- Small changes. Prefer editing an existing file over adding a new one; prefer reusing an export over writing a new function.

## Backend (apps/api)
- One feature = one module folder: `<name>.controller.ts`, `<name>.service.ts`, `<name>.module.ts`, plus `<name>.gateway.ts` only if it needs realtime.
- Register the module in `src/app.module.ts`.
- Inject `PrismaService`; never `new PrismaClient()`.
- Validate request bodies with `new ZodValidationPipe(schema)`.
- Persist before emitting a socket event.

## Frontend (apps/web)
- Wrap a library once in `src/components/ui`, export it from the barrel, consume via `@/components/ui`.
- One Rematch model per domain in `src/store/models`, registered in `models/index.ts`.
- Read state with `useAppSelector`, dispatch with `useAppDispatch`.
- HTTP only in `lib/api.ts`; sockets only in `lib/ws.ts`.
- Tailwind for layout/spacing, wrapped AntD for components.

## Naming
- Files: kebab-case for backend (`runner.service.ts`), PascalCase for React components (`RunDetailPage.tsx`).
- Modules, services, and store models named after the domain noun (`ledger`, `catalog`, `runs`).

## Verify before done
- Backend: `pnpm --filter @vcc-workflow/api typecheck`
- Web: `pnpm --filter @vcc-workflow/web typecheck`
- Schema: `pnpm --filter @vcc-workflow/schema build`

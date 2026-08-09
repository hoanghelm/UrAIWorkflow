# Backend rules (apps/api)

- NestJS with feature modules under `src/modules/*`. Each module owns its controller, service, and (where relevant) gateway.
- Prisma is the only data access layer. `PrismaService` is global; inject it, never instantiate `PrismaClient` elsewhere.
- Validate inbound payloads against `@vcc-workflow/schema` zod contracts via `ZodValidationPipe`.
- Long-running execution lives in `modules/runner`. It is the only place that drives the plan → act → verify → decide loop and enforces guardrails.
- Agent execution is abstracted behind `AgentPort` (`AGENT_PORT` token). SDK adapters (Copilot SDK, Claude Agent SDK) implement it; the runner depends on the port, never on a concrete SDK. `StubAgentAdapter` is the default until a real adapter lands.
- Real-time run events go through `RunnerGateway` (socket.io, namespace `/runs`). Persist first, then emit.
- No code comments.

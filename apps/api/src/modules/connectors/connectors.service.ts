import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import {
  connectorSchema,
  createConnectorInputSchema,
  defaultClaudeModels,
  modelMapSchema,
  type Connector,
  type ConnectorUsage,
  type CreateConnectorInput,
  type ModelMap,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { decryptSecret, encryptSecret, isEncrypted } from "./crypto";

const loadAgentQuery = new Function(
  "return import('@anthropic-ai/claude-agent-sdk')",
) as () => Promise<{
  query: (args: { prompt: string; options?: Record<string, unknown> }) => AsyncIterable<{ type: string }>;
}>;

export interface ActiveConnector {
  id: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  models: ModelMap;
}

interface ConnectorRow {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string | null;
  models: string;
  active: boolean;
}

@Injectable()
export class ConnectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateConnectorInput): Promise<Connector> {
    const parsed = createConnectorInputSchema.parse(input);
    const models = modelMapSchema.parse({ ...defaultClaudeModels(), ...(parsed.models ?? {}) });
    const row = await this.prisma.connector.create({
      data: {
        id: nanoid(),
        name: parsed.name,
        provider: parsed.provider,
        apiKey: encryptSecret(parsed.apiKey),
        baseUrl: parsed.baseUrl ?? null,
        models: JSON.stringify(models),
        active: false,
      },
    });
    return this.mask(row);
  }

  async list(): Promise<Connector[]> {
    const rows = await this.prisma.connector.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.mask(r));
  }

  async setActive(id: string): Promise<Connector> {
    await this.prisma.connector.updateMany({ data: { active: false } });
    const row = await this.prisma.connector.update({ where: { id }, data: { active: true } });
    return this.mask(row);
  }

  async deactivate(): Promise<Connector[]> {
    await this.prisma.connector.updateMany({ data: { active: false } });
    return this.list();
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.prisma.connector.delete({ where: { id } });
    return { id };
  }

  async usage(): Promise<ConnectorUsage> {
    const active = await this.prisma.connector.findFirst({ where: { active: true } });
    const grouped = await this.prisma.stage.groupBy({
      by: ["model"],
      where: { tokens: { gt: 0 } },
      _sum: { tokens: true },
    });
    const totals = await this.prisma.run.aggregate({
      _sum: { tokensConsumed: true, tokensSaved: true },
    });
    const levers = await this.prisma.ledgerEntry.groupBy({
      by: ["lever"],
      _sum: { saved: true },
    });
    const byLever: Record<string, number> = {};
    for (const l of levers) {
      byLever[l.lever] = l._sum.saved ?? 0;
    }
    return {
      account: active ? { id: active.id, name: active.name, provider: active.provider as never } : null,
      models: active ? (JSON.parse(active.models) as ModelMap) : null,
      byModel: grouped
        .map((g) => ({ model: g.model, tokens: g._sum.tokens ?? 0 }))
        .sort((a, b) => b.tokens - a.tokens),
      totalConsumed: totals._sum.tokensConsumed ?? 0,
      totalSaved: totals._sum.tokensSaved ?? 0,
      byLever,
    };
  }

  async getActive(): Promise<ActiveConnector | null> {
    const row = await this.prisma.connector.findFirst({ where: { active: true } });
    if (!row) {
      return null;
    }
    if (row.apiKey && !isEncrypted(row.apiKey)) {
      await this.prisma.connector.update({
        where: { id: row.id },
        data: { apiKey: encryptSecret(row.apiKey) },
      });
    }
    return {
      id: row.id,
      provider: row.provider,
      apiKey: decryptSecret(row.apiKey),
      baseUrl: row.baseUrl ?? undefined,
      models: JSON.parse(row.models) as ModelMap,
    };
  }

  async test(id: string): Promise<{ ok: boolean; error?: string }> {
    const row = await this.prisma.connector.findUniqueOrThrow({ where: { id } });
    const models = JSON.parse(row.models) as ModelMap;
    const apiKey = decryptSecret(row.apiKey);
    if (row.provider === "claude-agent") {
      try {
        const { query } = await loadAgentQuery();
        for await (const message of query({
          prompt: "Reply with the single word: ok",
          options: { model: models.haiku, allowedTools: [], permissionMode: "bypassPermissions" },
        })) {
          if (message.type === "result") {
            return { ok: true };
          }
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "not logged in to Claude" };
      }
    }
    try {
      const client = new Anthropic({ apiKey, baseURL: row.baseUrl ?? undefined });
      await client.messages.create({
        model: models.haiku,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
    }
  }

  private mask(row: ConnectorRow): Connector {
    return connectorSchema.parse({
      id: row.id,
      name: row.name,
      provider: row.provider,
      baseUrl: row.baseUrl ?? undefined,
      models: JSON.parse(row.models),
      active: row.active,
      hasKey: Boolean(row.apiKey),
    });
  }
}

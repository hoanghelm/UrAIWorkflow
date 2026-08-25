import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import {
  connectorSchema,
  createConnectorInputSchema,
  defaultClaudeModels,
  defaultCopilotModels,
  modelMapSchema,
  type Connector,
  type ConnectorUsage,
  type CreateConnectorInput,
  type ModelMap,
} from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { decryptSecret, encryptSecret, isEncrypted } from "./crypto";
import { pollAccessToken, requestDeviceCode, type DeviceCode } from "./copilot";
import { resolveClaudeExecutable, ensureAgentEnv } from "../runner/claude-executable";

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

  async startCopilotLogin(): Promise<DeviceCode> {
    return requestDeviceCode();
  }

  async pollCopilotLogin(
    deviceCode: string,
  ): Promise<{ status: "pending" | "authorized"; connector?: Connector }> {
    const result = await pollAccessToken(deviceCode);
    if (result.status !== "authorized" || !result.token) {
      return { status: "pending" };
    }
    const models = modelMapSchema.parse(defaultCopilotModels());
    const row = await this.prisma.connector.create({
      data: {
        id: nanoid(),
        name: "GitHub Copilot",
        provider: "copilot",
        apiKey: encryptSecret(result.token),
        baseUrl: null,
        models: JSON.stringify(models),
        active: false,
      },
    });
    return { status: "authorized", connector: this.mask(row) };
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

  private async toActive(row: ConnectorRow): Promise<ActiveConnector> {
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

  async getActive(): Promise<ActiveConnector | null> {
    const row = await this.prisma.connector.findFirst({ where: { active: true } });
    return row ? this.toActive(row) : null;
  }

  async getActiveForProject(projectId?: string): Promise<ActiveConnector | null> {
    if (projectId) {
      const pick = await this.prisma.workspaceConnector.findUnique({ where: { projectId } });
      if (pick) {
        const row = await this.prisma.connector.findUnique({ where: { id: pick.connectorId } });
        if (row) {
          return this.toActive(row);
        }
      }
    }
    return this.getActive();
  }

  async setActiveForProject(projectId: string, connectorId: string): Promise<{ connectorId: string }> {
    await this.prisma.workspaceConnector.upsert({
      where: { projectId },
      create: { projectId, connectorId },
      update: { connectorId },
    });
    return { connectorId };
  }

  async clearActiveForProject(projectId: string): Promise<{ projectId: string }> {
    await this.prisma.workspaceConnector.deleteMany({ where: { projectId } });
    return { projectId };
  }

  async projectActive(projectId: string): Promise<{ connectorId: string | null }> {
    const pick = await this.prisma.workspaceConnector.findUnique({ where: { projectId } });
    return { connectorId: pick?.connectorId ?? null };
  }

  async test(id: string): Promise<{ ok: boolean; error?: string }> {
    const row = await this.prisma.connector.findUniqueOrThrow({ where: { id } });
    const models = JSON.parse(row.models) as ModelMap;
    const apiKey = decryptSecret(row.apiKey);
    if (row.provider === "claude-agent") {
      try {
        ensureAgentEnv();
        const { query } = await loadAgentQuery();
        const claudeExecutable = resolveClaudeExecutable();
        for await (const message of query({
          prompt: "Reply with the single word: ok",
          options: {
            model: models.haiku,
            allowedTools: [],
            permissionMode: "bypassPermissions",
            ...(claudeExecutable ? { pathToClaudeCodeExecutable: claudeExecutable } : {}),
          },
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

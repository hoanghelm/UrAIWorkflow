import { Injectable, OnModuleInit } from "@nestjs/common";
import { existsSync, readFileSync } from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { PrismaService } from "../../prisma/prisma.service";

export interface BundleEntry {
  id: string;
  kind: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  stars: number;
  source: string;
  archive?: string;
  entries?: string[];
  members?: string[];
  mcp?: { name: string; command: string; args: string[] };
}

@Injectable()
export class BundlesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  private rootCache: string | null = null;
  private indexCache: Map<string, BundleEntry> | null = null;

  root(): string {
    if (this.rootCache) {
      return this.rootCache;
    }
    const candidates = [
      process.env.BUNDLES_ROOT,
      path.join(process.cwd(), "bundles"),
      path.join(__dirname, "..", "..", "..", "bundles"),
      path.join(__dirname, "..", "..", "..", "..", "bundles"),
    ].filter(Boolean) as string[];
    this.rootCache =
      candidates.find((c) => existsSync(path.join(c, "index.json"))) ??
      path.join(process.cwd(), "bundles");
    return this.rootCache;
  }

  private index(): Map<string, BundleEntry> {
    if (this.indexCache) {
      return this.indexCache;
    }
    const map = new Map<string, BundleEntry>();
    try {
      const raw = readFileSync(path.join(this.root(), "index.json"), "utf8");
      for (const entry of JSON.parse(raw) as BundleEntry[]) {
        map.set(entry.id, entry);
      }
    } catch {
      // no bundle store on disk
    }
    this.indexCache = map;
    return map;
  }

  entry(id: string): BundleEntry | undefined {
    return this.index().get(id);
  }

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const entries = [...this.index().values()];
    for (const entry of entries) {
      const row = {
        id: entry.id,
        kind: entry.kind,
        name: entry.name,
        description: entry.description,
        author: entry.author,
        tags: JSON.stringify(entry.tags ?? []),
        stars: entry.stars ?? 0,
        source: entry.source ?? "",
        archive: entry.archive ?? "",
        meta: JSON.stringify({
          members: entry.members ?? [],
          entries: entry.entries ?? [],
          mcp: entry.mcp ?? null,
        }),
      };
      await this.prisma.bundle.upsert({ where: { id: entry.id }, create: row, update: row });
    }
    const ids = entries.map((e) => e.id);
    await this.prisma.bundle.deleteMany({
      where: { id: { notIn: ids.length ? ids : ["__none__"] } },
    });
  }

  list() {
    return this.prisma.bundle.findMany({ orderBy: { stars: "desc" } });
  }

  primaryContent(id: string): string {
    const entry = this.entry(id);
    if (!entry?.archive || !entry.entries?.length) {
      return "";
    }
    try {
      const zip = new AdmZip(path.join(this.root(), entry.archive));
      return zip.readAsText(entry.entries[0]);
    } catch {
      return "";
    }
  }

  extractInto(id: string, destRoot: string): boolean {
    const entry = this.entry(id);
    if (!entry?.archive) {
      return false;
    }
    try {
      const zip = new AdmZip(path.join(this.root(), entry.archive));
      zip.extractAllTo(destRoot, true);
      return true;
    } catch {
      return false;
    }
  }
}

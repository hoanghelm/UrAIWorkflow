import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { nanoid } from "nanoid";
import { packManifestSchema, type PackManifest } from "@vcc-workflow/schema";
import { PrismaService } from "../../prisma/prisma.service";
import { builtinPacks } from "./builtin-packs";
import { compareSemver } from "./semver";

export interface PackSummary {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string;
  roles: string[];
  tags: string[];
  trust: string;
  installed: boolean;
}

@Injectable()
export class PacksService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    for (const manifest of builtinPacks) {
      const parsed = packManifestSchema.parse(manifest);
      const exists = await this.prisma.pack.findUnique({
        where: { name_version: { name: parsed.name, version: parsed.version } },
      });
      if (exists) {
        await this.prisma.pack.update({
          where: { id: exists.id },
          data: {
            description: parsed.description,
            trust: parsed.trust,
            manifest: JSON.stringify(parsed),
          },
        });
      } else {
        await this.prisma.pack.create({
          data: {
            id: nanoid(),
            name: parsed.name,
            version: parsed.version,
            description: parsed.description,
            trust: parsed.trust,
            manifest: JSON.stringify(parsed),
            installed: true,
          },
        });
      }
    }
  }

  async list(): Promise<PackSummary[]> {
    const rows = await this.prisma.pack.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => this.toSummary(r));
  }

  private toSummary(r: {
    id: string;
    name: string;
    version: string;
    description: string;
    trust: string;
    installed: boolean;
    manifest: string;
  }): PackSummary {
    const manifest = packManifestSchema.parse(JSON.parse(r.manifest));
    return {
      id: r.id,
      name: r.name,
      title: manifest.title || r.name,
      version: r.version,
      description: r.description,
      roles: manifest.roles,
      tags: manifest.tags,
      trust: r.trust,
      installed: r.installed,
    };
  }

  async get(name: string): Promise<PackManifest> {
    const rows = await this.prisma.pack.findMany({ where: { name } });
    if (rows.length === 0) {
      throw new NotFoundException(`Pack "${name}" not found`);
    }
    const latest = [...rows].sort((a, b) => compareSemver(b.version, a.version))[0];
    return packManifestSchema.parse(JSON.parse(latest.manifest));
  }

  private async latestVersion(name: string): Promise<string> {
    const rows = await this.prisma.pack.findMany({ where: { name }, select: { version: true } });
    if (rows.length === 0) {
      throw new NotFoundException(`Pack "${name}" not found`);
    }
    return [...rows].sort((a, b) => compareSemver(b.version, a.version))[0].version;
  }

  async listForProject(projectId: string): Promise<
    Array<PackSummary & { installedVersion: string | null; latestVersion: string; updateAvailable: boolean }>
  > {
    const rows = await this.prisma.pack.findMany({ orderBy: { name: "asc" } });
    const pins = await this.prisma.projectPack.findMany({ where: { projectId } });
    const pinBy = new Map(pins.map((p) => [p.packName, p.installedVersion]));
    const latestBy = new Map<string, { version: string; row: (typeof rows)[number] }>();
    for (const row of rows) {
      const cur = latestBy.get(row.name);
      if (!cur || compareSemver(row.version, cur.version) > 0) {
        latestBy.set(row.name, { version: row.version, row });
      }
    }
    return [...latestBy.values()].map(({ version, row }) => {
      const installedVersion = pinBy.get(row.name) ?? null;
      return {
        ...this.toSummary(row),
        installed: installedVersion !== null,
        installedVersion,
        latestVersion: version,
        updateAvailable: installedVersion !== null && compareSemver(version, installedVersion) > 0,
      };
    });
  }

  async installForProject(
    projectId: string,
    packName: string,
  ): Promise<{ packName: string; installedVersion: string }> {
    const installedVersion = await this.latestVersion(packName);
    await this.prisma.projectPack.upsert({
      where: { projectId_packName: { projectId, packName } },
      create: { projectId, packName, installedVersion },
      update: { installedVersion },
    });
    return { packName, installedVersion };
  }

  async uninstallForProject(projectId: string, packName: string): Promise<{ packName: string }> {
    await this.prisma.projectPack.deleteMany({ where: { projectId, packName } });
    return { packName };
  }

  async setInstalled(id: string, installed: boolean): Promise<PackSummary> {
    const row = await this.prisma.pack.update({
      where: { id },
      data: { installed },
    });
    return this.toSummary(row);
  }
}

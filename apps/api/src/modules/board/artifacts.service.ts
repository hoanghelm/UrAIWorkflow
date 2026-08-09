import { Injectable } from "@nestjs/common";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import * as tar from "tar";

const EXCLUDE = new Set([
  "node_modules",
  ".git",
  ".worktrees",
  ".vcc",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  ".svelte-kit",
  ".output",
  "coverage",
  ".cache",
  ".parcel-cache",
  "tmp",
  ".DS_Store",
]);

const ARTIFACT_DIR = process.env.VCC_ARTIFACT_DIR || join(process.cwd(), "data", "artifacts");

export interface Bundle {
  path: string;
  sizeBytes: number;
  fileCount: number;
}

@Injectable()
export class ArtifactsService {
  async pack(sourceDir: string, id: string): Promise<Bundle> {
    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    const out = join(ARTIFACT_DIR, `${id}.tgz`);
    let fileCount = 0;
    await tar.create(
      {
        gzip: true,
        file: out,
        cwd: sourceDir,
        portable: true,
        filter: (path, stat) => {
          const parts = path.split(/[\\/]/).filter(Boolean);
          if (parts.some((seg) => EXCLUDE.has(seg))) {
            return false;
          }
          const isFile = (stat as { isFile?: () => boolean }).isFile?.() ?? false;
          if (isFile) {
            fileCount += 1;
          }
          return true;
        },
      },
      ["."],
    );
    const stat = await fs.stat(out);
    return { path: out, sizeBytes: stat.size, fileCount };
  }

  async unpack(archivePath: string, destDir: string): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    await tar.extract({ file: archivePath, cwd: destDir });
  }
}

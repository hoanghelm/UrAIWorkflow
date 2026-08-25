import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "schema.prisma"), "utf8");

const converted = source.replace(
  /datasource\s+db\s*\{[^}]*\}/,
  `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`,
);

const header = "// Generated from ../schema.prisma by gen-postgres-schema.mjs. Do not edit.\n\n";
const outDir = join(here, "postgres");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schema.prisma"), header + converted);
console.log("wrote prisma/postgres/schema.prisma");

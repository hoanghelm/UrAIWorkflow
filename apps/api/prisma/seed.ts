import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "Nothing to seed. Built-in agents, skills, tools, MCPs and template packs are seeded " +
      "idempotently on API boot (CatalogService + PacksService onModuleInit). " +
      "Register a workspace in the app to scan its local .claude files.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

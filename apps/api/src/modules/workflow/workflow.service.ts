import { Injectable } from "@nestjs/common";
import { workflowSchema, type Workflow } from "@vcc-workflow/schema";
import { PacksService } from "../packs/packs.service";

@Injectable()
export class WorkflowService {
  constructor(private readonly packs: PacksService) {}

  async fromPack(packName: string, inputs: Record<string, unknown>): Promise<Workflow> {
    const manifest = await this.packs.get(packName);
    return workflowSchema.parse({
      name: manifest.name,
      pack: manifest.name,
      inputs,
      stages: manifest.stages,
      levers: manifest.levers,
      routing: {},
      guardrails: manifest.guardrails,
    });
  }
}

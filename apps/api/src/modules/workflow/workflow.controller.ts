import { Body, Controller, Post } from "@nestjs/common";
import {
  generateWorkflowInputSchema,
  type GenerateWorkflowInput,
  type Workflow,
} from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { WorkflowService } from "./workflow.service";
import { AiService } from "../ai/ai.service";

@Controller("workflows")
export class WorkflowController {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly ai: AiService,
  ) {}

  @Post("from-pack")
  fromPack(@Body() body: { pack: string; inputs?: Record<string, unknown> }) {
    return this.workflow.fromPack(body.pack, body.inputs ?? {});
  }

  @Post("generate")
  async generate(
    @Body(new ZodValidationPipe(generateWorkflowInputSchema)) body: GenerateWorkflowInput,
  ): Promise<Workflow> {
    const result = await this.ai.generate({ kind: "workflow", ...body });
    return result.artifact as Workflow;
  }
}

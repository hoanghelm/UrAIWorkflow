import { Body, Controller, Post } from "@nestjs/common";
import {
  generateDiagramInputSchema,
  type GenerateDiagramInput,
  type GeneratedDiagram,
} from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AiService } from "../ai/ai.service";

@Controller("diagrams")
export class DiagramsController {
  constructor(private readonly ai: AiService) {}

  @Post("generate")
  async generate(
    @Body(new ZodValidationPipe(generateDiagramInputSchema)) body: GenerateDiagramInput,
  ): Promise<GeneratedDiagram> {
    const result = await this.ai.generate({ kind: "diagram", ...body });
    return result.artifact as GeneratedDiagram;
  }
}

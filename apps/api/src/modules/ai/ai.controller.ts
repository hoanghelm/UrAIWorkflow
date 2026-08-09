import { Body, Controller, Get, Post } from "@nestjs/common";
import { aiGenerateInputSchema, type AiGenerateInput } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("kinds")
  kinds() {
    return this.ai.kinds();
  }

  @Get("personas")
  personas() {
    return this.ai.personas();
  }

  @Post("generate")
  generate(@Body(new ZodValidationPipe(aiGenerateInputSchema)) body: AiGenerateInput) {
    return this.ai.generate(body);
  }
}

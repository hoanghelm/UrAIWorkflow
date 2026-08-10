import { Body, Controller, Post } from "@nestjs/common";
import { FigmaService } from "./figma.service";

@Controller("figma")
export class FigmaController {
  constructor(private readonly figma: FigmaService) {}

  @Post("generate")
  generate(
    @Body() body: { projectId: string; figmaUrl: string; token: string; title?: string },
  ) {
    return this.figma.generate(body.projectId, body.figmaUrl, body.token, body.title);
  }
}

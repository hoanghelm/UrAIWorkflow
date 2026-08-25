import { Body, Controller, Get, Post } from "@nestjs/common";
import { TestService } from "./test.service";
import type { TestKind } from "./test-workflow";

@Controller()
export class TestController {
  constructor(private readonly svc: TestService) {}

  @Get("test-workflows")
  workflows() {
    return this.svc.workflows();
  }

  @Post("test-generate")
  generate(
    @Body()
    body: {
      kind: TestKind;
      requirement: string;
      context?: string;
      model?: "opus" | "sonnet" | "haiku";
      streamId?: string;
    },
  ) {
    return this.svc.generatePreview(body.kind, body.requirement, body.context, body.model, body.streamId);
  }
}

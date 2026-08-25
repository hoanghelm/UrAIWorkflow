import { Injectable } from "@nestjs/common";
import { AiService } from "../ai/ai.service";
import {
  buildTestGuidance,
  testWorkflowViews,
  TEST_WORKFLOWS,
  type TestKind,
  type TestWorkflowView,
} from "./test-workflow";

@Injectable()
export class TestService {
  constructor(private readonly ai: AiService) {}

  workflows(): TestWorkflowView[] {
    return testWorkflowViews();
  }

  async generatePreview(
    kind: TestKind,
    requirement: string,
    context = "",
    model?: "opus" | "sonnet" | "haiku",
    streamId?: string,
  ): Promise<{ content: string; format: "code" | "markdown"; summary: string }> {
    const format = TEST_WORKFLOWS[kind]?.format ?? "code";
    const result = await this.ai.generate({
      kind,
      requirement,
      context,
      model,
      streamId,
      guidance: buildTestGuidance(kind),
    });
    const obj = (result.artifact ?? {}) as { code?: string; markdown?: string };
    const content = format === "markdown" ? (obj.markdown ?? "") : (obj.code ?? "");
    return { content, format, summary: result.summary };
  }
}

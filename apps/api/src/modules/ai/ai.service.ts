import { BadRequestException, Injectable } from "@nestjs/common";
import type { AiGenerateInput, AiGenerateResult, PersonaPack } from "@vcc-workflow/schema";
import { RunnerService } from "../runner/runner.service";
import { PacksService } from "../packs/packs.service";
import { GENERATORS } from "./generators";
import { PERSONA_PACKS, personaByKey } from "./personas";

@Injectable()
export class AiService {
  constructor(
    private readonly runner: RunnerService,
    private readonly packs: PacksService,
  ) {}

  kinds(): Array<{ kind: string; label: string }> {
    return Object.values(GENERATORS).map((g) => ({ kind: g.kind, label: g.label }));
  }

  personas(): PersonaPack[] {
    return PERSONA_PACKS.map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      domains: p.domains,
      starters: p.starters,
    }));
  }

  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const gen = GENERATORS[input.kind];
    if (!gen) {
      throw new BadRequestException(`Unknown AI Builder kind: ${input.kind}`);
    }
    const deps = { packs: gen.needsPacks ? (await this.packs.list()).map((p) => p.name) : [] };
    const instruction = gen.instruction(
      { requirement: input.requirement, context: input.context },
      deps,
    );
    const lens = input.persona ? personaByKey[input.persona]?.persona : undefined;
    const persona = [lens, gen.persona, input.guidance].filter(Boolean).join("\n\n");

    const { text } = await this.runner.runAiSession({
      runId: input.streamId,
      name: gen.label,
      pack: `ai-${gen.kind}`,
      agent: gen.agent,
      action: gen.action,
      instruction,
      persona: persona || undefined,
      model: input.model ?? gen.model,
      input: { requirement: input.requirement, context: input.context },
    });

    const parsed = gen.parse(text);
    if (!parsed) {
      throw new BadRequestException(
        "The model did not return a valid result. Activate a Claude connector and retry.",
      );
    }
    return { kind: gen.kind, artifact: parsed.artifact, summary: parsed.summary };
  }
}

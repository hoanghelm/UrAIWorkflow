import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createDesignInputSchema,
  createDesignArtifactInputSchema,
  updateDesignArtifactInputSchema,
  type CreateDesignInput,
  type CreateDesignArtifactInput,
  type DesignKind,
  type UpdateDesignArtifactInput,
} from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { DesignService } from "./design.service";

@Controller()
export class DesignController {
  constructor(private readonly svc: DesignService) {}

  @Get("design-workflows")
  workflows() {
    return this.svc.workflows();
  }

  @Post("design-generate")
  generatePreview(
    @Body()
    body: {
      kind: DesignKind;
      requirement: string;
      context?: string;
      model?: "opus" | "sonnet" | "haiku";
      streamId?: string;
    },
  ) {
    return this.svc.generatePreview(body.kind, body.requirement, body.context, body.model, body.streamId);
  }

  @Get("designs")
  designs(@Query("projectId") projectId: string) {
    return this.svc.designs(projectId);
  }

  @Post("designs")
  createDesign(@Body(new ZodValidationPipe(createDesignInputSchema)) body: CreateDesignInput) {
    return this.svc.createDesign(body);
  }

  @Get("designs/:id")
  design(@Param("id") id: string) {
    return this.svc.design(id);
  }

  @Patch("designs/:id")
  renameDesign(@Param("id") id: string, @Body() body: { name: string; description?: string }) {
    return this.svc.renameDesign(id, body.name, body.description);
  }

  @Delete("designs/:id")
  deleteDesign(@Param("id") id: string) {
    return this.svc.deleteDesign(id);
  }

  @Get("designs/:id/artifacts")
  artifacts(@Param("id") id: string) {
    return this.svc.artifacts(id);
  }

  @Post("design-artifacts")
  createArtifact(
    @Body(new ZodValidationPipe(createDesignArtifactInputSchema)) body: CreateDesignArtifactInput,
  ) {
    return this.svc.createArtifact(body);
  }

  @Get("design-artifacts/:id")
  artifact(@Param("id") id: string) {
    return this.svc.artifact(id);
  }

  @Patch("design-artifacts/:id")
  updateArtifact(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateDesignArtifactInputSchema)) body: UpdateDesignArtifactInput,
  ) {
    return this.svc.updateArtifact(id, body);
  }

  @Delete("design-artifacts/:id")
  deleteArtifact(@Param("id") id: string) {
    return this.svc.deleteArtifact(id);
  }

  @Get("design-artifacts/:id/versions")
  versions(@Param("id") id: string) {
    return this.svc.versions(id);
  }

  @Post("design-artifacts/:id/restore")
  restoreVersion(@Param("id") id: string, @Body() body: { versionId: string }) {
    return this.svc.restoreVersion(id, body.versionId);
  }

  @Post("design-artifacts/:id/generate")
  generate(
    @Param("id") id: string,
    @Body()
    body: { requirement: string; persona?: string; streamId?: string; model?: "opus" | "sonnet" | "haiku" },
  ) {
    return this.svc.generate(id, body.requirement, body.persona, body.streamId, body.model);
  }
}

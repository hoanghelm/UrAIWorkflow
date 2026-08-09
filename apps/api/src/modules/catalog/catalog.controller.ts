import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { explainCodeInputSchema, type ExplainCodeInput } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("projects")
  projects() {
    return this.catalog.listProjects();
  }

  @Get("summary")
  summary() {
    return this.catalog.projectSummaries();
  }

  @Post("projects")
  register(@Body() body: { name: string; root: string; persona?: string }) {
    return this.catalog.registerProject(body.name, body.root, body.persona);
  }

  @Patch("projects/:id/persona")
  setPersona(@Param("id") id: string, @Body() body: { persona: string }) {
    return this.catalog.setPersona(id, body.persona);
  }

  @Delete("projects/:id")
  removeProject(@Param("id") id: string) {
    return this.catalog.removeProject(id);
  }

  @Delete("items/:id")
  removeItem(@Param("id") id: string) {
    return this.catalog.removeItem(id);
  }

  @Get("projects/:id/folders")
  folders(@Param("id") id: string) {
    return this.catalog.folders(id);
  }

  @Post("projects/:id/discover")
  discover(@Param("id") id: string) {
    return this.catalog.discover(id);
  }

  @Get("projects/:id/diagram")
  diagram(@Param("id") id: string) {
    return this.catalog.projectDiagram(id);
  }

  @Get("projects/:id/codegraph")
  codegraph(@Param("id") id: string) {
    return this.catalog.codeGraph(id);
  }

  @Get("projects/:id/codegraph/diagram")
  codegraphDiagram(@Param("id") id: string, @Query("level") level?: string) {
    return this.catalog.codeGraphDiagram(id, level === "file" ? "file" : "folder");
  }

  @Post("projects/:id/explain")
  explain(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(explainCodeInputSchema)) body: ExplainCodeInput,
  ) {
    return this.catalog.explain(id, body);
  }

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.catalog.list(projectId);
  }
}

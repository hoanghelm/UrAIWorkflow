import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import {
  createRunInputSchema,
  resumeRunInputSchema,
  type CreateRunInput,
  type ResumeRunInput,
} from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { RunnerService } from "./runner.service";

@Controller("runs")
export class RunnerController {
  constructor(private readonly runner: RunnerService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.runner.list(projectId);
  }

  @Get("headroom")
  headroom() {
    return this.runner.headroomSnapshot();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.runner.get(id);
  }

  @Get(":id/logs")
  logs(@Param("id") id: string) {
    return this.runner.logs(id);
  }

  @Get(":id/events")
  events(@Param("id") id: string) {
    return this.runner.events(id);
  }

  @Get(":id/artifacts")
  artifacts(@Param("id") id: string) {
    return this.runner.runArtifacts(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createRunInputSchema)) body: CreateRunInput,
  ) {
    return this.runner.create(body);
  }

  @Post(":id/resume")
  resume(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(resumeRunInputSchema)) body: ResumeRunInput,
  ) {
    return this.runner.resume(id, body.answer);
  }

  @Post(":id/stop")
  stop(@Param("id") id: string) {
    return this.runner.stop(id);
  }

  @Post(":id/rerun/:stageId")
  rerunStage(@Param("id") id: string, @Param("stageId") stageId: string) {
    return this.runner.rerunStage(id, stageId);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.runner.remove(id);
  }
}

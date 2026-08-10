import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createBoardCardInputSchema,
  createBoardCommentInputSchema,
  moveBoardCardInputSchema,
  type CreateBoardCardInput,
  type CreateBoardCommentInput,
  type MoveBoardCardInput,
} from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { BoardService } from "./board.service";

@Controller("board")
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get()
  list(@Query("projectId") projectId: string) {
    return this.board.list(projectId);
  }

  @Get("artifact-versions")
  artifactVersions(@Query("projectId") projectId: string) {
    return this.board.artifactVersions(projectId);
  }

  @Get("artifacts")
  artifacts(@Query("projectId") projectId: string) {
    return this.board.artifacts(projectId);
  }

  @Post("collect-all")
  collectAll(@Body() body: { projectId: string }) {
    return this.board.collectAll(body.projectId);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createBoardCardInputSchema)) body: CreateBoardCardInput) {
    return this.board.create(body);
  }

  @Patch(":id/move")
  move(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(moveBoardCardInputSchema)) body: MoveBoardCardInput,
  ) {
    return this.board.move(id, body.status, body.order);
  }

  @Get(":id/runs")
  runs(@Param("id") id: string) {
    return this.board.runsForCard(id);
  }

  @Get(":id/activity")
  activity(@Param("id") id: string) {
    return this.board.activity(id);
  }

  @Get(":id/comments")
  comments(@Param("id") id: string) {
    return this.board.comments(id);
  }

  @Delete(":id/comments/:commentId")
  deleteComment(@Param("commentId") commentId: string) {
    return this.board.deleteComment(commentId);
  }

  @Post(":id/comments")
  addComment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createBoardCommentInputSchema)) body: CreateBoardCommentInput,
  ) {
    return this.board.addComment(id, body);
  }

  @Post(":id/run")
  run(@Param("id") id: string) {
    return this.board.run(id);
  }

  @Post(":id/plan")
  plan(@Param("id") id: string, @Body() body: { streamId?: string }) {
    return this.board.plan(id, body?.streamId);
  }

  @Post(":id/collect")
  collect(@Param("id") id: string) {
    return this.board.collect(id);
  }

  @Get(":id/bundles")
  bundles(@Param("id") id: string) {
    return this.board.bundles(id);
  }

  @Post(":id/rerun")
  rerun(@Param("id") id: string) {
    return this.board.rerunFromArtifact(id);
  }

  @Get(":id/preview")
  previewStatus(@Param("id") id: string) {
    return this.board.previewStatus(id);
  }

  @Post(":id/preview")
  previewStart(@Param("id") id: string, @Body() body: { artifactId?: string }) {
    return this.board.previewStart(id, body?.artifactId);
  }

  @Post(":id/preview/stop")
  previewStop(@Param("id") id: string) {
    return this.board.previewStop(id);
  }

  @Post(":id/link")
  link(@Param("id") id: string, @Body() body: { targetId: string }) {
    return this.board.link(id, body.targetId);
  }

  @Delete(":id/link/:targetId")
  unlink(@Param("id") id: string, @Param("targetId") targetId: string) {
    return this.board.unlink(id, targetId);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.board.remove(id);
  }
}

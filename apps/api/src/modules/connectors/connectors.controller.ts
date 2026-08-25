import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { createConnectorInputSchema, type CreateConnectorInput } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ConnectorsLockGuard } from "../../common/connectors-lock.guard";
import { ConnectorsService } from "./connectors.service";

@Controller("connectors")
@UseGuards(ConnectorsLockGuard)
export class ConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  @Get()
  list() {
    return this.connectors.list();
  }

  @Get("usage")
  usage() {
    return this.connectors.usage();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createConnectorInputSchema)) body: CreateConnectorInput) {
    return this.connectors.create(body);
  }

  @Post("copilot/login")
  copilotLogin() {
    return this.connectors.startCopilotLogin();
  }

  @Post("copilot/poll")
  copilotPoll(@Body() body: { deviceCode: string }) {
    return this.connectors.pollCopilotLogin(body.deviceCode);
  }

  @Post("deactivate")
  deactivate() {
    return this.connectors.deactivate();
  }

  @Get("active")
  projectActive(@Query("projectId") projectId: string) {
    return this.connectors.projectActive(projectId);
  }

  @Post("active")
  setActiveForProject(@Body() body: { projectId: string; connectorId: string }) {
    return this.connectors.setActiveForProject(body.projectId, body.connectorId);
  }

  @Delete("active")
  clearActiveForProject(@Query("projectId") projectId: string) {
    return this.connectors.clearActiveForProject(projectId);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string) {
    return this.connectors.setActive(id);
  }

  @Post(":id/test")
  test(@Param("id") id: string) {
    return this.connectors.test(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.connectors.remove(id);
  }
}

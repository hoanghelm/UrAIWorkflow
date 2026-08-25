import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { PacksService } from "./packs.service";

@Controller("packs")
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  @Get()
  list() {
    return this.packs.list();
  }

  @Get("project/:projectId")
  listForProject(@Param("projectId") projectId: string) {
    return this.packs.listForProject(projectId);
  }

  @Post(":name/install")
  install(@Param("name") name: string, @Body() body: { projectId: string }) {
    return this.packs.installForProject(body.projectId, name);
  }

  @Post(":name/uninstall")
  uninstall(@Param("name") name: string, @Body() body: { projectId: string }) {
    return this.packs.uninstallForProject(body.projectId, name);
  }

  @Get(":name")
  get(@Param("name") name: string) {
    return this.packs.get(name);
  }

  @Patch(":id/installed")
  setInstalled(@Param("id") id: string, @Body() body: { installed: boolean }) {
    return this.packs.setInstalled(id, body.installed);
  }
}

import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { PacksService } from "./packs.service";

@Controller("packs")
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  @Get()
  list() {
    return this.packs.list();
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

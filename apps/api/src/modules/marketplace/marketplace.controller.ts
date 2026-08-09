import { Body, Controller, Get, Post } from "@nestjs/common";
import { installRequestSchema, type InstallRequest } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { MarketplaceService } from "./marketplace.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  list() {
    return this.marketplace.list();
  }

  @Post("install")
  install(@Body(new ZodValidationPipe(installRequestSchema)) body: InstallRequest) {
    return this.marketplace.install(body.projectId, body.ids);
  }
}

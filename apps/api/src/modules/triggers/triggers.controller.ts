import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { createTriggerInputSchema, type CreateTriggerInput } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TriggersService } from "./triggers.service";

@Controller("triggers")
export class TriggersController {
  constructor(private readonly triggers: TriggersService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.triggers.list(projectId);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTriggerInputSchema)) body: CreateTriggerInput) {
    return this.triggers.create(body);
  }

  @Post(":id/fire")
  fire(@Param("id") id: string) {
    return this.triggers.fire(id);
  }

  @Patch(":id/enabled")
  setEnabled(@Param("id") id: string, @Body() body: { enabled: boolean }) {
    return this.triggers.setEnabled(id, body.enabled);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.triggers.remove(id);
  }
}

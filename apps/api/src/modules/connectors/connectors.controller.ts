import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { createConnectorInputSchema, type CreateConnectorInput } from "@vcc-workflow/schema";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ConnectorsService } from "./connectors.service";

@Controller("connectors")
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

  @Post("deactivate")
  deactivate() {
    return this.connectors.deactivate();
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

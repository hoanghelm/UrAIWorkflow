import { Controller, Get } from "@nestjs/common";
import { deploymentMode, isHosted } from "../../common/deployment";
import { serverPolicy } from "../../common/server-policy";

@Controller()
export class WhoamiController {
  @Get("whoami")
  whoami() {
    return { mode: deploymentMode(), authRequired: isHosted(), version: "0.1.0", ...serverPolicy() };
  }
}

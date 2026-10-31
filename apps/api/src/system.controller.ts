import { Controller, Get } from "@nestjs/common";

@Controller()
export class SystemController {
  @Get("health")
  health() {
    return {
      ok: true,
      service: "socialhub-api",
      integrationsMode: process.env.INTEGRATIONS_MODE === "live" ? "live" : "mock",
    };
  }
}

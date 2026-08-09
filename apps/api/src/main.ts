import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
  app.enableCors({ origin, credentials: true });
  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("VCC-Workflow API")
    .setDescription("Local-first token-efficient AI workflow platform")
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();

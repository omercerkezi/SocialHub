import "reflect-metadata";
import "./env";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: true });
  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  const server = app.getHttpAdapter().getInstance();
  server.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  await app.listen(Number(process.env.PORT || 3000));
}

void bootstrap();

import "reflect-metadata";
// Must stay above every import that reads the environment: imports are
// evaluated in order, and `env` parses `process.env` as it loads.
import "dotenv/config";
import { env } from "./env";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

async function start() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  await app.listen(env.PORT);
}

start();

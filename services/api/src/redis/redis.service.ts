import { createClient } from "redis";
import { env } from "../env";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      url: env.REDIS_URL,
    });

    this.client.on("error", (err) => {
      this.logger.error("Redis client error", err);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  getDel(key: string): Promise<string | null> {
    return this.client.getDel(key);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(keys);
  }
}

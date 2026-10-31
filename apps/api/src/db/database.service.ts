import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { SCHEMA_SQL } from "./sql";
import { seedIfEmpty } from "../seed";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  pool!: Pool;
  db!: NodePgDatabase<typeof schema>;

  async onModuleInit() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    this.pool = new Pool({ connectionString: url });
    this.db = drizzle(this.pool, { schema });
    await this.pool.query(SCHEMA_SQL);
    if (process.env.SEED !== "false") await seedIfEmpty(this.db);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}

import { env } from "!/env";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { definePlugin } from "nitro";
import postgres from "postgres";

async function runMigrations() {
  console.log("🔧 Setting up database schema...");

  const pgClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    const db = drizzle(pgClient);

    await pgClient`CREATE SCHEMA IF NOT EXISTS workflow`;

    const migrationsFolder = path.join(process.cwd(), "drizzle");
    console.log(`📂 Running migrations from: ${migrationsFolder}`);

    await migrate(db, {
      migrationsFolder,
      migrationsTable: "migrations",
    });

    console.log("✅ Database migrations completed!");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 如果是"已存在"错误，说明表已创建但迁移记录缺失，可以忽略
    if (message.includes("already exists")) {
      console.log("⚠️ Tables already exist, skipping migrations");
    } else {
      console.error("❌ Failed to run migrations:", error);
    }
  } finally {
    await pgClient.end();
  }
}

// 启动时执行迁移
await runMigrations();

if (process.env.WORKFLOW_TARGET_WORLD === "@workflow/world-postgres") {
  console.log("Starting Postgres World...");

  const { getWorld } = await import("workflow/runtime");
  await getWorld().start?.();
  console.log("Postgres World started");
}

export default definePlugin(async () => {
  // nitroApp.hooks.hook("request", async () => {});
});

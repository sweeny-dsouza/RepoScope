import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let isConnected = false;

function parseDatabaseUrl(url: string) {
  try {
    const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      return { error: "Invalid DATABASE_URL format" };
    }
    return {
      user: match[1],
      password: match[2].replace(/[^*]/g, '*'),
      host: match[3],
      port: match[4],
      database: match[5],
    };
  } catch {
    return { error: "Failed to parse DATABASE_URL" };
  }
}

export async function checkDatabaseConnection() {
  const parsed = parseDatabaseUrl(env.databaseUrl);

  if ('error' in parsed) {
    console.error("[Database] ❌", parsed.error);
    return { success: false, error: parsed.error };
  }

  try {
    const db = getDb();

    await db.execute(sql`SELECT 1 as connected`);
    await db.execute(sql`SELECT DATABASE() as current_db`);
    await db.execute(sql`SHOW TABLES`);

    try {
      await db.execute(sql`DESCRIBE users`);
    } catch (tableError) {
      console.error("[Database] ❌ Users table does not exist");
      console.error("[Database] Error:", tableError);
    }

    isConnected = true;
    console.log("[Database] ✅ Database connected successfully");

    return { success: true, parsed };
  } catch (error) {
    isConnected = false;
    console.error("[Database] ================================");
    console.error("[Database] ❌ Database connection FAILED");
    console.error("[Database] ================================");

    if (error instanceof Error) {
      console.error("[Database] Error name:", error.name);
      console.error("[Database] Error message:", error.message);

      const mysqlError = error as any;
      console.error("[Database] MySQL error code:", mysqlError.code || "N/A");
      console.error("[Database] MySQL errno:", mysqlError.errno || "N/A");
      console.error("[Database] MySQL fatal:", mysqlError.fatal || "N/A");
      console.error("[Database] MySQL errors:", mysqlError.errors ? JSON.stringify(mysqlError.errors, null, 2) : "N/A");
    }

    console.error("[Database] ================================");
    console.error("[Database] 💡 Troubleshooting:");
    console.error("[Database] 1. Check if MySQL is running: mysqladmin ping");
    console.error("[Database] 2. Start MySQL: brew services start mysql (Mac) or net start mysql (Windows)");
    console.error("[Database] 3. Verify credentials in .env file");
    console.error("[Database] 4. Create database: CREATE DATABASE reposcope;");
    console.error("[Database] 5. Run migrations: npm run db:push");
    console.error("[Database] ================================");

    return { success: false, error };
  }
}

export function getDb() {
  if (!instance) {
    instance = drizzle(env.databaseUrl, {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}

export function getConnectionStatus() {
  return { connected: isConnected };
}

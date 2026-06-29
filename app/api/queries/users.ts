import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  // Prepare insert values, omitting undefined fields to avoid MySQL NULL errors
  const rawValues = { ...data };
  // Ensure role has a sensible default if not provided
  if (rawValues.role === undefined) {
    rawValues.role = "user";
  }
  // Remove any undefined properties before inserting
  const values: Partial<InsertUser> = Object.fromEntries(
    Object.entries(rawValues).filter(([, v]) => v !== undefined)
  );
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...values,
  };

  // If the user is the repository owner, promote to admin
  if (
    values.role &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  try {
    const db = getDb();

    try {
      const result = await db
        .insert(schema.users)
        .values(values)
        .onDuplicateKeyUpdate({ set: updateSet });
      return result;
    } catch (insertError) {
      console.error("[Database] ❌ Inner INSERT attempt failed");
      throw insertError;
    }
  } catch (error) {
    console.error("[Database] ================================");
    console.error("[Database] ❌ Upsert FAILED");
    console.error("[Database] ================================");

    if (error instanceof Error) {
      console.error("[Database] Error name:", error.name);
      console.error("[Database] Error message:", error.message);
      console.error("[Database] Error stack:", error.stack);

      // Extract MySQL-specific error codes
      const mysqlError = error as any;
      console.error("[Database] MySQL error code:", mysqlError.code || "N/A");
      console.error("[Database] MySQL error number:", mysqlError.errno || "N/A");
      console.error("[Database] MySQL SQL state:", mysqlError.sqlState || "N/A");
      console.error("[Database] MySQL sqlMessage:", mysqlError.sqlMessage || "N/A");
      console.error("[Database] MySQL sql:", mysqlError.sql || "N/A");
    } else {
      console.error("[Database] Unknown error:", error);
    }

    console.error("[Database] ================================");

    throw error;
  }
}

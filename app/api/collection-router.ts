import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { collections } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const collectionRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(collections)
      .where(eq(collections.userId, ctx.user.id))
      .orderBy(collections.createdAt);
  }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        color: z.string().max(7).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(collections).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        color: input.color || "#4ADE80",
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(500).optional(),
        color: z.string().max(7).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(collections)
        .set(updates)
        .where(and(eq(collections.id, id), eq(collections.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(collections)
        .where(and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id)));
      return { success: true };
    }),
});

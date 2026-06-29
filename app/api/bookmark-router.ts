import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bookmarks } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const bookmarkRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          collectionId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const conditions = [eq(bookmarks.userId, userId)];
      if (input?.collectionId) {
        conditions.push(eq(bookmarks.collectionId, input.collectionId));
      }

      return db
        .select()
        .from(bookmarks)
        .where(and(...conditions))
        .orderBy(bookmarks.createdAt);
    }),

  create: authedQuery
    .input(
      z.object({
        repoOwner: z.string().min(1),
        repoName: z.string().min(1),
        collectionId: z.number().optional(),
        repoData: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db.insert(bookmarks).values({
        userId,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        collectionId: input.collectionId || null,
        repoData: input.repoData || null,
      });

      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.id, input.id), eq(bookmarks.userId, userId)));

      return { success: true };
    }),

  updateCollection: authedQuery
    .input(z.object({ id: z.number(), collectionId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .update(bookmarks)
        .set({ collectionId: input.collectionId })
        .where(
          and(eq(bookmarks.id, input.id), eq(bookmarks.userId, userId))
        );

      return { success: true };
    }),
});

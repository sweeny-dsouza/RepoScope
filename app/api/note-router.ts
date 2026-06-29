import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notes } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const noteRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          repoOwner: z.string().optional(),
          repoName: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(notes.userId, ctx.user.id)];

      if (input?.repoOwner && input?.repoName) {
        conditions.push(eq(notes.repoOwner, input.repoOwner));
        conditions.push(eq(notes.repoName, input.repoName));
      }

      return db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(notes.createdAt);
    }),

  create: authedQuery
    .input(
      z.object({
        repoOwner: z.string().min(1),
        repoName: z.string().min(1),
        content: z.string().min(1),
        isLearningGoal: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(notes).values({
        userId: ctx.user.id,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        content: input.content,
        isLearningGoal: input.isLearningGoal || false,
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1),
        isLearningGoal: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(notes)
        .set(updates)
        .where(and(eq(notes.id, id), eq(notes.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(notes)
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)));
      return { success: true };
    }),
});

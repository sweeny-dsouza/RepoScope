import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userProfiles, bookmarks, notes, recentViews } from "@db/schema";
import { eq, count } from "drizzle-orm";

export const userRouter = createRouter({
  getProfile: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const bookmarkCount = await db
      .select({ count: count() })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));

    const noteCount = await db
      .select({ count: count() })
      .from(notes)
      .where(eq(notes.userId, userId));

    return {
      user: ctx.user,
      profile: profiles[0] || null,
      bookmarkCount: bookmarkCount[0]?.count || 0,
      noteCount: noteCount[0]?.count || 0,
    };
  }),

  updateProfile: authedQuery
    .input(
      z.object({
        primaryLanguages: z.array(z.string()).optional(),
        experienceLevel: z
          .enum(["beginner", "intermediate", "advanced"])
          .optional(),
        areasOfInterest: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const existing = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(userProfiles)
          .set({
            primaryLanguages: input.primaryLanguages,
            experienceLevel: input.experienceLevel,
            areasOfInterest: input.areasOfInterest,
          })
          .where(eq(userProfiles.userId, userId));
      } else {
        await db.insert(userProfiles).values({
          userId,
          primaryLanguages: input.primaryLanguages || [],
          experienceLevel: input.experienceLevel || "intermediate",
          areasOfInterest: input.areasOfInterest || [],
        });
      }

      return { success: true };
    }),

  recordView: authedQuery
    .input(
      z.object({
        repoOwner: z.string().min(1),
        repoName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(recentViews).values({
        userId: ctx.user.id,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
      });
      return { success: true };
    }),

  getRecentViews: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(recentViews)
      .where(eq(recentViews.userId, ctx.user.id))
      .orderBy(recentViews.viewedAt)
      .limit(20);
  }),
});

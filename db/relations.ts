import { relations } from "drizzle-orm";
import {
  users,
  userProfiles,
  bookmarks,
  collections,
  notes,
  recentViews,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  bookmarks: many(bookmarks),
  collections: many(collections),
  notes: many(notes),
  recentViews: many(recentViews),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  collection: one(collections, {
    fields: [bookmarks.collectionId],
    references: [collections.id],
  }),
}));

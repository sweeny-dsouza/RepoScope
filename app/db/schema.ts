import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfiles = mysqlTable("userProfiles", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id)
    .unique(),
  primaryLanguages: json("primaryLanguages").$type<string[]>(),
  experienceLevel: mysqlEnum("experienceLevel", [
    "beginner",
    "intermediate",
    "advanced",
  ]),
  areasOfInterest: json("areasOfInterest").$type<string[]>(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfiles.$inferSelect;

export const collections = mysqlTable("collections", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  color: varchar("color", { length: 7 }).default("#4ADE80"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Collection = typeof collections.$inferSelect;

export const bookmarks = mysqlTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  collectionId: bigint("collectionId", {
    mode: "number",
    unsigned: true,
  }).references(() => collections.id),
  repoOwner: varchar("repoOwner", { length: 255 }).notNull(),
  repoName: varchar("repoName", { length: 255 }).notNull(),
  repoData: json("repoData").$type<Record<string, any> | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;

export const notes = mysqlTable("notes", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  repoOwner: varchar("repoOwner", { length: 255 }).notNull(),
  repoName: varchar("repoName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isLearningGoal: boolean("isLearningGoal").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Note = typeof notes.$inferSelect;

export const cacheEntries = mysqlTable("cacheEntries", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cacheKey", { length: 500 }).notNull().unique(),
  data: json("data").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CacheEntry = typeof cacheEntries.$inferSelect;

export const aiSummaries = mysqlTable("aiSummaries", {
  id: serial("id").primaryKey(),
  repoOwner: varchar("repoOwner", { length: 255 }).notNull(),
  repoName: varchar("repoName", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  contributionAnalysis: text("contributionAnalysis"),
  difficultyRating: mysqlEnum("difficultyRating", [
    "beginner",
    "intermediate",
    "advanced",
  ]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AiSummary = typeof aiSummaries.$inferSelect;

export const recentViews = mysqlTable("recentViews", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  repoOwner: varchar("repoOwner", { length: 255 }).notNull(),
  repoName: varchar("repoName", { length: 255 }).notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type RecentView = typeof recentViews.$inferSelect;

import { authRouter } from "./auth-router";
import { githubRouter } from "./github-router";
import { bookmarkRouter } from "./bookmark-router";
import { collectionRouter } from "./collection-router";
import { noteRouter } from "./note-router";
import { aiRouter } from "./ai-router";
import { userRouter } from "./user-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  github: githubRouter,
  bookmark: bookmarkRouter,
  collection: collectionRouter,
  note: noteRouter,
  ai: aiRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

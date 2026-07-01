import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  // After esbuild bundles api/boot.ts → dist/boot.js,
  // import.meta.dirname = <repo-root>/dist
  // "../dist/public" from there = <repo-root>/dist/public  ✓
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // serveStatic root must be relative to process.cwd().
  // Compute it dynamically so it works regardless of where node is invoked from.
  const staticRoot = path.relative(process.cwd(), distPath);

  app.use("*", serveStatic({ root: staticRoot }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}

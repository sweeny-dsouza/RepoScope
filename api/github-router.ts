import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cacheEntries } from "@db/schema";
import { eq, gt, and } from "drizzle-orm";
import { env } from "./lib/env";

const GITHUB_API_BASE = "https://api.github.com";

function buildGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RepoScope",
  };
  if (env.githubToken) {
    headers["Authorization"] = `Bearer ${env.githubToken}`;
  }
  return headers;
}

interface CacheResult {
  data: any;
  fromCache: boolean;
  stale?: boolean;
}

async function fetchWithCache(
  cacheKey: string,
  fetchFn: () => Promise<Response>,
  ttlMinutes: number
): Promise<CacheResult> {
  // Try cache lookup; fall through gracefully if database is unavailable
  try {
    const db = getDb();
    const now = new Date();

    const cached = await db
      .select()
      .from(cacheEntries)
      .where(
        and(eq(cacheEntries.cacheKey, cacheKey), gt(cacheEntries.expiresAt, now))
      )
      .limit(1);

    if (cached.length > 0) {
      return { data: cached[0].data as any, fromCache: true };
    }
  } catch (dbError) {
    console.warn("[cache] Database unavailable, skipping cache lookup:", dbError instanceof Error ? dbError.message : dbError);
  }

  const response = await fetchFn();
  if (!response.ok) {
    // Try stale cache on rate limit (403), but fall through gracefully
    try {
      const db = getDb();
      const stale = await db
        .select()
        .from(cacheEntries)
        .where(eq(cacheEntries.cacheKey, cacheKey))
        .limit(1);
      if (stale.length > 0) {
        return { data: stale[0].data as any, fromCache: true, stale: true };
      }
    } catch {
      // Database unavailable — skip stale cache
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: any = await response.json();

  // Try to store in cache, but don't fail if database is unavailable
  try {
    const db = getDb();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await db
      .insert(cacheEntries)
      .values({ cacheKey, data, expiresAt })
      .onDuplicateKeyUpdate({ set: { data, expiresAt } });
  } catch (dbError) {
    console.warn("[cache] Database unavailable, skipping cache write:", dbError instanceof Error ? dbError.message : dbError);
  }

  return { data, fromCache: false };
}

export const githubRouter = createRouter({
  searchRepos: publicQuery
    .input(
      z.object({
        query: z.string().min(1),
        language: z.string().optional(),
        sort: z.string().optional(),
        order: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ input }) => {
      const { query, language, sort, order, page, perPage } = input;
      let q = query;
      if (language) q += ` language:${language}`;

      const cacheKey = `github:search:${q}:${sort || "best"}:${order || "desc"}:${page}:${perPage}`;
      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(
            `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort || "stars"}&order=${order || "desc"}&page=${page}&per_page=${perPage}`,
            { headers: buildGithubHeaders() }
          ),
        60
      );

      const items = (result.data.items || []) as any[];
      return {
        items: items.map((item: any) => ({
          id: item.id,
          name: item.name,
          fullName: item.full_name,
          owner: item.owner.login,
          description: item.description,
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          updatedAt: item.updated_at,
          openIssues: item.open_issues_count,
          url: item.html_url,
          avatarUrl: item.owner.avatar_url,
        })),
        totalCount: result.data.total_count || 0,
        fromCache: result.fromCache,
      };
    }),

  getTrending: publicQuery
    .input(
      z
        .object({
          language: z.string().optional(),
          since: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const language = input?.language || "";
      const since = input?.since || "weekly";
      const sinceMap: Record<string, string> = {
        daily: "created:>" + new Date(Date.now() - 86400000).toISOString().split("T")[0],
        weekly: "created:>" + new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        monthly: "created:>" + new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      };

      let q = "stars:>100";
      if (language) q += ` language:${language}`;
      q += ` ${sinceMap[since]}`;

      const cacheKey = `github:trending:${language}:${since}`;
      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(
            `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`,
            { headers: buildGithubHeaders() }
          ),
        30
      );

      const items = (result.data.items || []) as any[];
      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        fullName: item.full_name,
        owner: item.owner.login,
        description: item.description,
        stars: item.stargazers_count,
        forks: item.forks_count,
        language: item.language,
        updatedAt: item.updated_at,
        openIssues: item.open_issues_count,
        url: item.html_url,
        avatarUrl: item.owner.avatar_url,
      }));
    }),

  getRepoDetails: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo } = input;
      const cacheKey = `github:repo:${owner}:${repo}`;

      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
            headers: buildGithubHeaders(),
          }),
        60
      );

      const data = result.data as any;
      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        owner: data.owner.login,
        ownerAvatar: data.owner.avatar_url,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        watchers: data.watchers_count,
        openIssues: data.open_issues_count,
        language: data.language,
        topics: data.topics || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        pushedAt: data.pushed_at,
        size: data.size,
        hasReadme: true,
        hasWiki: data.has_wiki,
        hasPages: data.has_pages,
        defaultBranch: data.default_branch,
        url: data.html_url,
        license: data.license?.name || null,
        fromCache: result.fromCache,
      };
    }),

  getRepoLanguages: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo } = input;
      const cacheKey = `github:lang:${owner}:${repo}`;

      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`, {
            headers: buildGithubHeaders(),
          }),
        360
      );

      const langData = result.data as Record<string, number>;
      const total = Object.values(langData).reduce((a: number, b: number) => a + b, 0);

      return Object.entries(langData).map(([name, bytes]) => ({
        name,
        bytes,
        percentage: Math.round((bytes / total) * 100),
      }));
    }),

  getContributors: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo } = input;
      const cacheKey = `github:contrib:${owner}:${repo}`;

      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=10`,
            { headers: buildGithubHeaders() }
          ),
        360
      );

      const contributors = Array.isArray(result.data) ? result.data : [];
      return contributors.map((c: any) => ({
        login: c.login,
        avatarUrl: c.avatar_url,
        contributions: c.contributions,
      }));
    }),

  getHealthScore: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo: repoName } = input;
      const cacheKey = `github:health:${owner}:${repoName}`;

      const result = await fetchWithCache(
        cacheKey,
        async () => {
          const [repoRes, commitsRes, issuesRes, contributorsRes] = await Promise.all([
            fetch(`${GITHUB_API_BASE}/repos/${owner}/${repoName}`, {
              headers: buildGithubHeaders(),
            }),
            fetch(
              `${GITHUB_API_BASE}/repos/${owner}/${repoName}/commits?per_page=100&since=${new Date(Date.now() - 30 * 86400000).toISOString()}`,
              { headers: buildGithubHeaders() }
            ),
            fetch(
              `${GITHUB_API_BASE}/repos/${owner}/${repoName}/issues?state=all&per_page=100`,
              { headers: buildGithubHeaders() }
            ),
            fetch(
              `${GITHUB_API_BASE}/repos/${owner}/${repoName}/contributors?per_page=1&anon=true`,
              { headers: buildGithubHeaders() }
            ),
          ]);

          const repoData = repoRes.ok ? await repoRes.json() : {};
          const commitsData = commitsRes.ok ? await commitsRes.json() : [];
          const issuesData = issuesRes.ok ? await issuesRes.json() : [];

          // Extract total contributor count from Link header (GitHub paginates contributors)
          let contributorCount = 0;
          if (contributorsRes.ok) {
            const linkHeader = contributorsRes.headers.get('link') || '';
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (match) {
              contributorCount = parseInt(match[1], 10);
            } else {
              // If no pagination link, count the items in the single page
              const contribData = await contributorsRes.json();
              contributorCount = Array.isArray(contribData) ? contribData.length : 0;
            }
          }

          return new Response(
            JSON.stringify({
              repoInfo: repoData,
              commitCount: Array.isArray(commitsData) ? commitsData.length : 0,
              issueList: Array.isArray(issuesData) ? issuesData : [],
              contributorCount,
            })
          );
        },
        360
      );

      const healthData = result.data as any;
      const repoInfo = healthData.repoInfo || {};
      const commitCount = healthData.commitCount || 0;
      const issueList = Array.isArray(healthData.issueList) ? healthData.issueList : [];
      const contributorCount = healthData.contributorCount || 0;

      const closedIssues = issueList.filter((i: any) => i.state === "closed").length;
      const totalIssues = issueList.length || 1;
      const stars = repoInfo.stargazers_count || 0;
      const forks = repoInfo.forks_count || 0;

      const scores = {
        activity: Math.min(commitCount / 10, 30),
        issueResolution: (closedIssues / totalIssues) * 25,
        contributors: Math.min(contributorCount / 5, 20),
        documentation: (repoInfo.has_wiki ? 5 : 0) + 10,
        popularity: Math.min((stars + forks) / 1000, 10),
      };

      const total = Math.round(
        scores.activity +
          scores.issueResolution +
          scores.contributors +
          scores.documentation +
          scores.popularity
      );

      let label: string;
      if (total >= 80) label = "Excellent";
      else if (total >= 60) label = "Good";
      else if (total >= 40) label = "Moderate";
      else label = "Needs Attention";

      return {
        score: Math.min(total, 100),
        label,
        breakdown: scores,
        fromCache: result.fromCache,
      };
    }),

  getDifficulty: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo: repoName } = input;
      const cacheKey = `github:diff:${owner}:${repoName}`;

      const result = await fetchWithCache(
        cacheKey,
        async () => {
          const [issuesRes, repoRes] = await Promise.all([
            fetch(
              `${GITHUB_API_BASE}/repos/${owner}/${repoName}/issues?labels=good+first+issue&state=open`,
              { headers: buildGithubHeaders() }
            ),
            fetch(`${GITHUB_API_BASE}/repos/${owner}/${repoName}`, {
              headers: buildGithubHeaders(),
            }),
          ]);

          const goodIssues = issuesRes.ok ? await issuesRes.json() : [];
          const repoData = (repoRes.ok ? await repoRes.json() : {}) as any;

          return new Response(
            JSON.stringify({
              goodFirstIssues: Array.isArray(goodIssues) ? goodIssues.length : 0,
              codeSize: (repoData.size || 0) * 1024,
              openIssues: repoData.open_issues_count || 0,
              stars: repoData.stargazers_count || 0,
            })
          );
        },
        360
      );

      const diffData = result.data as any;
      const goodFirstIssues = diffData.goodFirstIssues || 0;
      const codeSize = diffData.codeSize || 0;
      const openIssues = diffData.openIssues || 0;
      const stars = diffData.stars || 0;

      let score = 0;
      if (goodFirstIssues > 0) score -= 2;
      if (codeSize < 50000) score -= 1;
      if (codeSize > 500000) score += 2;
      if (openIssues > 100) score += 1;
      if (stars > 10000) score += 1;

      if (score <= -2)
        return {
          rating: "beginner" as const,
          label: "Beginner Friendly",
          color: "#22C55E",
        };
      if (score <= 1)
        return {
          rating: "intermediate" as const,
          label: "Intermediate",
          color: "#EAB308",
        };
      return {
        rating: "advanced" as const,
        label: "Senior Level",
        color: "#EF4444",
      };
    }),

  getCommitActivity: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      const { owner, repo: repoName } = input;
      const cacheKey = `github:commits:${owner}:${repoName}`;

      const result = await fetchWithCache(
        cacheKey,
        () =>
          fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repoName}/stats/commit_activity`,
            { headers: buildGithubHeaders() }
          ),
        360
      );

      const weeks = Array.isArray(result.data) ? result.data : [];
      return weeks.slice(-12).map((w: any, i: number) => ({
        week: `W${i + 1}`,
        total: w.total || 0,
      }));
    }),
});

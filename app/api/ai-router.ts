import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { aiSummaries, userProfiles } from "@db/schema";
import { eq, and } from "drizzle-orm";
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

// ─── Types ──────────────────────────────────────────────────────

interface RepoMetrics {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  contributors: number;
  primaryLanguage: string | null;
  description: string | null;
  createdAt: string | null;
  pushedAt: string | null;
  size: number;
  goodFirstIssues: number;
  recentCommits: number;
  historicalCommits: number;
}

type SignalLevel = "positive" | "moderate" | "negative";

interface IntelligenceSignal {
  label: string;
  level: SignalLevel;
}

export interface RepositoryIntelligence {
  projectMaturity: IntelligenceSignal;
  communityStrength: IntelligenceSignal;
  contributorDifficulty: IntelligenceSignal;
  riskAssessment: IntelligenceSignal;
  growthPotential: IntelligenceSignal;
  recommendation: string;
}

// ─── GitHub Metrics Fetcher ─────────────────────────────────────

function parseTotalFromLinkHeader(res: Response): number {
  const link = res.headers.get("link") || "";
  const match = link.match(/page=(\d+)>; rel="last"/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

async function fetchRepoMetrics(
  owner: string,
  repo: string,
): Promise<RepoMetrics> {
  const headers = buildGithubHeaders();

  const [repoRes, contribRes, commitRes, issuesRes] = await Promise.all([
    fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers }).catch(
      () => null,
    ),
    fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=1&anon=true`,
      { headers },
    ).catch(() => null),
    fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/stats/commit_activity`, {
      headers,
    }).catch(() => null),
    fetch(
      `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo} label:"good first issue" state:open`)}&per_page=1`,
      { headers },
    ).catch(() => null),
  ]);

  const repoData: any = repoRes?.ok ? await repoRes.json() : {};

  // Contributor count via Link header
  let contributors = 0;
  if (contribRes?.ok) {
    contributors = parseTotalFromLinkHeader(contribRes);
    if (contributors === 0) {
      try {
        const data = await contribRes.json();
        contributors = Array.isArray(data) ? data.length : 0;
      } catch {
        /* ignore */
      }
    }
  }

  // Commit activity trend (last 4 weeks vs previous 8 weeks)
  let recentCommits = 0;
  let historicalCommits = 0;
  if (commitRes?.ok) {
    try {
      const raw = await commitRes.json();
      const weeks = Array.isArray(raw) ? raw : [];
      if (weeks.length > 0) {
        const last4 = weeks.slice(-4);
        const prev8 = weeks.slice(-12, -4);
        recentCommits = last4.reduce(
          (sum, w) => sum + (w.total || 0),
          0,
        );
        historicalCommits =
          prev8.length > 0
            ? prev8.reduce((sum, w) => sum + (w.total || 0), 0)
            : recentCommits;
      }
    } catch {
      /* ignore */
    }
  }

  // Good first issues via search API total_count
  let goodFirstIssues = 0;
  if (issuesRes?.ok) {
    try {
      const raw = await issuesRes.json();
      const data = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
      goodFirstIssues = typeof data["total_count"] === "number" ? data["total_count"] : 0;
    } catch {
      /* ignore */
    }
  }

  return {
    stars: repoData.stargazers_count || 0,
    forks: repoData.forks_count || 0,
    watchers: repoData.watchers_count || 0,
    openIssues: repoData.open_issues_count || 0,
    contributors,
    primaryLanguage: repoData.language || null,
    description: repoData.description || null,
    createdAt: repoData.created_at || null,
    pushedAt: repoData.pushed_at || null,
    size: repoData.size || 0,
    goodFirstIssues,
    recentCommits,
    historicalCommits,
  };
}

// ─── Intelligence Computation ───────────────────────────────────

function computeProjectMaturity(m: RepoMetrics): IntelligenceSignal {
  const ageDays = m.createdAt
    ? (Date.now() - new Date(m.createdAt).getTime()) / 86400000
    : 0;

  if (ageDays < 180 || m.stars < 100)
    return { label: "Experimental", level: "negative" };
  if (ageDays < 730 || m.stars < 1000)
    return { label: "Growing", level: "moderate" };
  if (m.stars >= 10000 && m.forks >= 1000 && ageDays >= 1095)
    return { label: "Enterprise Grade", level: "positive" };
  return { label: "Mature", level: "positive" };
}

function computeCommunityStrength(m: RepoMetrics): IntelligenceSignal {
  if (m.contributors >= 500 || m.forks >= 5000)
    return { label: "Exceptional", level: "positive" };
  if (m.contributors >= 100 || m.forks >= 500)
    return { label: "Strong", level: "positive" };
  if (m.contributors >= 20 || m.forks >= 50)
    return { label: "Active", level: "moderate" };
  return { label: "Weak", level: "negative" };
}

function computeContributorDifficulty(m: RepoMetrics): IntelligenceSignal {
  if (m.stars >= 50000 || m.size >= 500000)
    return { label: "Expert Only", level: "negative" };
  if (m.stars >= 10000 || m.size >= 50000)
    return { label: "Advanced", level: "moderate" };
  if (m.goodFirstIssues >= 5 && m.stars < 5000)
    return { label: "Beginner Friendly", level: "positive" };
  return { label: "Intermediate", level: "moderate" };
}

function computeRiskAssessment(m: RepoMetrics): IntelligenceSignal {
  const daysSincePush = m.pushedAt
    ? (Date.now() - new Date(m.pushedAt).getTime()) / 86400000
    : 999;
  const issuesPerContributor = m.openIssues / Math.max(m.contributors, 1);

  if (daysSincePush >= 180 || issuesPerContributor >= 50)
    return { label: "High Risk", level: "negative" };
  if (daysSincePush >= 30 || issuesPerContributor >= 10)
    return { label: "Moderate Risk", level: "moderate" };
  return { label: "Low Risk", level: "positive" };
}

function computeGrowthPotential(m: RepoMetrics): IntelligenceSignal {
  if (m.recentCommits === 0 && m.historicalCommits === 0)
    return { label: "Stable", level: "moderate" };

  const ratio =
    m.historicalCommits > 0
      ? m.recentCommits / m.historicalCommits
      : m.recentCommits > 0
        ? 2
        : 0;

  if (ratio < 0.5) return { label: "Declining", level: "negative" };
  if (ratio > 1.5) return { label: "High Growth", level: "positive" };
  if (ratio > 1.1) return { label: "Promising", level: "positive" };
  return { label: "Stable", level: "moderate" };
}

function mapDifficultyToEnum(
  label: string,
): "beginner" | "intermediate" | "advanced" {
  if (label === "Beginner Friendly") return "beginner";
  if (label === "Advanced" || label === "Expert Only") return "advanced";
  return "intermediate";
}

// ─── Text Generation ────────────────────────────────────────────

function generateRecommendation(
  signals: Omit<RepositoryIntelligence, "recommendation">,
  m: RepoMetrics,
): string {
  const { projectMaturity, communityStrength, contributorDifficulty, riskAssessment, growthPotential } = signals;

  if (contributorDifficulty.label === "Beginner Friendly" && riskAssessment.level === "positive")
    return "Good for first-time open-source contributors. The project has accessible issues and a welcoming structure.";
  if (contributorDifficulty.label === "Beginner Friendly")
    return "Beginner-friendly with accessible issues, though monitor project activity before contributing.";
  if (contributorDifficulty.label === "Expert Only")
    return "Best suited for experienced maintainers and advanced contributors familiar with large-scale codebases.";
  if (contributorDifficulty.label === "Advanced" && communityStrength.level === "positive")
    return "Suitable for experienced developers seeking real-world collaboration in a well-supported project.";
  if (contributorDifficulty.label === "Advanced")
    return "Best suited for advanced contributors with domain expertise and significant project experience.";
  if (contributorDifficulty.label === "Intermediate" && growthPotential.level === "positive")
    return "Promising project for intermediate developers to gain real-world collaboration experience.";
  if (contributorDifficulty.label === "Intermediate" && projectMaturity.level === "positive")
    return "Suitable for intermediate developers seeking structured collaboration in a mature codebase.";
  if (contributorDifficulty.label === "Intermediate")
    return "Suitable for intermediate developers seeking real-world collaboration opportunities.";
  if (projectMaturity.label === "Enterprise Grade" && communityStrength.level === "positive")
    return "Strong repository for learning large-scale project organization and industry best practices.";
  if (projectMaturity.level === "positive" && communityStrength.level === "positive")
    return "Well-established project ideal for learning professional development practices.";
  if (projectMaturity.level === "moderate" && communityStrength.level !== "negative")
    return "Growing project with active community — good opportunity for early involvement.";
  if (riskAssessment.level === "negative")
    return "Exercise caution — the project shows signs of reduced activity or high issue backlog.";
  if (growthPotential.level === "negative")
    return "Project activity is declining. Evaluate carefully before committing to contributions.";

  const lang = m.primaryLanguage ? ` ${m.primaryLanguage}` : "";
  return `Repository with${lang} ${m.stars.toLocaleString()} stars and ${m.contributors} contributors. Review open issues to find contribution opportunities.`;
}

function generateSummaryText(
  signals: Omit<RepositoryIntelligence, "recommendation">,
  m: RepoMetrics,
): string {
  const lang = m.primaryLanguage ? ` Written in ${m.primaryLanguage},` : "";
  return `A ${signals.projectMaturity.label.toLowerCase()} project with${lang} ${m.stars.toLocaleString()} stars, ${m.forks.toLocaleString()} forks, and ${m.contributors} contributors. Community engagement is ${signals.communityStrength.label.toLowerCase()} with ${m.openIssues.toLocaleString()} open issues.`;
}

function generateContributionAnalysis(
  signals: Omit<RepositoryIntelligence, "recommendation">,
  m: RepoMetrics,
): string {
  const parts: string[] = [];

  if (m.goodFirstIssues > 0) {
    parts.push(`${m.goodFirstIssues} good first issue${m.goodFirstIssues !== 1 ? "s" : ""} available for newcomers.`);
  }
  if (m.contributors >= 100) {
    parts.push(`Large contributor base (${m.contributors}) indicating active community participation.`);
  } else if (m.contributors >= 20) {
    parts.push(`Active contributor base (${m.contributors}) with steady participation.`);
  } else {
    parts.push(`Small contributor base (${m.contributors}) — opportunities for meaningful impact.`);
  }
  if (signals.growthPotential.label === "High Growth" || signals.growthPotential.label === "Promising") {
    parts.push("Commit activity is trending upward, indicating healthy project momentum.");
  } else if (signals.growthPotential.label === "Declining") {
    parts.push("Commit activity has slowed recently — verify project health before contributing.");
  }

  return parts.join(" ");
}

// ─── Router ──────────────────────────────────────────────────────

export const aiRouter = createRouter({
  getSummary: publicQuery
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      // Fetch live metrics from GitHub API
      const metrics = await fetchRepoMetrics(input.owner, input.repo);

      // Compute deterministic intelligence from metrics
      const signals = {
        projectMaturity: computeProjectMaturity(metrics),
        communityStrength: computeCommunityStrength(metrics),
        contributorDifficulty: computeContributorDifficulty(metrics),
        riskAssessment: computeRiskAssessment(metrics),
        growthPotential: computeGrowthPotential(metrics),
      };

      const recommendation = generateRecommendation(signals, metrics);
      const intelligence: RepositoryIntelligence = {
        ...signals,
        recommendation,
      };

      const summary = generateSummaryText(signals, metrics);
      const contributionAnalysis = generateContributionAnalysis(
        signals,
        metrics,
      );
      const difficultyRating = mapDifficultyToEnum(
        signals.contributorDifficulty.label,
      );

      // Try cache lookup; fall through gracefully if database is unavailable
      try {
        const db = getDb();
        const cached = await db
          .select()
          .from(aiSummaries)
          .where(
            and(
              eq(aiSummaries.repoOwner, input.owner),
              eq(aiSummaries.repoName, input.repo),
            ),
          )
          .limit(1);

        if (cached.length > 0) {
          return {
            summary: cached[0].summary,
            contributionAnalysis:
              cached[0].contributionAnalysis || contributionAnalysis,
            difficultyRating: cached[0].difficultyRating || difficultyRating,
            fromCache: true,
            intelligence,
          };
        }
      } catch (dbError) {
        console.warn(
          "[ai] Database unavailable, skipping cache lookup:",
          dbError instanceof Error ? dbError.message : dbError,
        );
      }

      // Try to store for future, but don't fail if database is unavailable
      try {
        const db = getDb();
        await db.insert(aiSummaries).values({
          repoOwner: input.owner,
          repoName: input.repo,
          summary,
          contributionAnalysis,
          difficultyRating,
        });
      } catch (dbError) {
        console.warn(
          "[ai] Database unavailable, skipping cache write:",
          dbError instanceof Error ? dbError.message : dbError,
        );
      }

      return {
        summary,
        contributionAnalysis,
        difficultyRating,
        fromCache: false,
        intelligence,
      };
    }),

  getRecommendations: authedQuery
    .input(
      z
        .object({ limit: z.number().min(1).max(20).default(5) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const limit = input?.limit || 5;

      // Get user profile
      const profiles = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);

      const profile = profiles[0];

      // Build language preferences
      const languages = profile?.primaryLanguages || [];
      const interests = profile?.areasOfInterest || [];

      // Search GitHub for trending repos matching user preferences
      const searchQueries: string[] = [];

      if (languages.length > 0) {
        languages.forEach((lang) => {
          searchQueries.push(`stars:>500 language:${lang}`);
        });
      } else {
        searchQueries.push("stars:>1000");
      }

      // Add interest-based keywords
      const interestKeywords: Record<string, string> = {
        web: "web framework",
        "ai-ml": "machine learning",
        devtools: "developer tools",
        mobile: "mobile app",
        systems: "systems programming",
        data: "data science",
        security: "security",
        blockchain: "blockchain",
      };

      if (interests.length > 0) {
        interests.forEach((interest) => {
          const keyword = interestKeywords[interest];
          if (keyword) {
            searchQueries.push(`stars:>300 ${keyword}`);
          }
        });
      }

      // Fetch from GitHub API
      const results: any[] = [];
      const seen = new Set<string>();

      for (const q of searchQueries.slice(0, 3)) {
        try {
          const res = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "RepoScope",
              },
            },
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            for (const item of data.items || []) {
              const key = `${item.owner.login}/${item.name}`;
              if (!seen.has(key)) {
                seen.add(key);
                results.push({
                  id: item.id,
                  name: item.name,
                  fullName: item.full_name,
                  owner: item.owner.login,
                  description: item.description,
                  stars: item.stargazers_count,
                  forks: item.forks_count,
                  language: item.language,
                  updatedAt: item.updated_at,
                  url: item.html_url,
                  avatarUrl: item.owner.avatar_url,
                });
              }
            }
          }
        } catch (e) {
          // Ignore individual query failures
        }
      }

      return results.slice(0, limit);
    }),
});

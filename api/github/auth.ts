import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "../session";
import { findUserByUnionId, upsertUser } from "../queries/users";

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
};

async function exchangeAuthCode(
  code: string,
): Promise<GitHubTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.githubClientId,
    client_secret: env.githubClientSecret,
    code,
  });

  const url = `https://github.com/login/oauth/access_token?${body.toString()}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  const responseText = await resp.text();

  if (!resp.ok) {
    throw new Error(`Token exchange failed (${resp.status}): ${responseText}`);
  }

  try {
    const jsonResponse = JSON.parse(responseText);

    if (jsonResponse.error) {
      throw new Error(`GitHub API error: ${jsonResponse.error} - ${jsonResponse.error_description}`);
    }

    return jsonResponse as GitHubTokenResponse;
  } catch (parseError) {
    console.error("[GitHub OAuth] Failed to parse JSON:", parseError);
    throw new Error(`Invalid JSON response: ${responseText}`);
  }
}

async function fetchUserProfile(
  accessToken: string,
): Promise<GitHubUser> {
  const resp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const responseText = await resp.text();

  if (!resp.ok) {
    throw new Error(`Failed to fetch user profile (${resp.status}): ${responseText}`);
  }

  try {
    const userProfile = JSON.parse(responseText);
    return userProfile as GitHubUser;
  } catch (parseError) {
    console.error("[GitHub OAuth] Failed to parse user profile JSON:", parseError);
    throw new Error(`Invalid user profile JSON: ${responseText}`);
  }
}

async function fetchUserEmails(
  accessToken: string,
): Promise<GitHubEmail[]> {
  const resp = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const responseText = await resp.text();
    console.warn("[GitHub OAuth] Failed to fetch emails:", responseText);
    return [];
  }

  try {
    const emails = await resp.json() as GitHubEmail[];
    return emails;
  } catch (parseError) {
    console.error("[GitHub OAuth] Failed to parse emails JSON:", parseError);
    return [];
  }
}

function findPrimaryEmail(emails: GitHubEmail[]): string | null {
  // Find primary AND verified email
  const primaryEmail = emails.find(e => e.primary && e.verified);
  if (primaryEmail) {
    return primaryEmail.email;
  }

  // Fallback to any verified email
  const verifiedEmail = emails.find(e => e.verified);
  if (verifiedEmail) {
    return verifiedEmail.email;
  }

  return null;
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    console.warn("[auth] No session cookie found in request.");
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createGitHubOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      console.error("[GitHub OAuth] GitHub returned error:", error, errorDescription);
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      return c.json(
        { error, error_description: errorDescription },
        400,
      );
    }

    if (!code) {
      console.error("[GitHub OAuth] No authorization code provided");
      return c.json({ error: "code is required" }, 400);
    }

    try {
      // Step 1: Exchange code for access token
      const tokenResp = await exchangeAuthCode(code);

      // Step 2: Fetch user profile from GitHub
      const githubUser = await fetchUserProfile(tokenResp.access_token);

      // Step 3: Fetch user emails from GitHub
      const userEmails = await fetchUserEmails(tokenResp.access_token);
      const primaryEmail = findPrimaryEmail(userEmails);

      // Step 4: Use GitHub ID as unionId
      const unionId = String(githubUser.id);

      // Step 5: Upsert user in database

      // Ensure name is never null (fallback to login)
      const userName = githubUser.name || githubUser.login;

      // Use primary email from emails API, fallback to profile email, then undefined
      const userEmail = primaryEmail || githubUser.email || undefined;

      try {
        await upsertUser({
          unionId,
          name: userName,
          avatar: githubUser.avatar_url,
          email: userEmail,
          lastSignInAt: new Date(),
        });
      } catch (dbError) {
        console.error("[GitHub OAuth] ❌ Database upsert failed");
        console.error("[GitHub OAuth] Error:", dbError);
        console.error("[GitHub OAuth] Attempted payload:", {
          unionId,
          name: userName,
          email: userEmail,
          avatar: githubUser.avatar_url,
        });
        throw dbError;
      }

      // Step 6: Sign session token
      const token = await signSessionToken({
        unionId,
        clientId: env.githubClientId,
      });

      // Step 7: Set session cookie
      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      // Step 8: Redirect to home
      return c.redirect("/", 302);
    } catch (error) {
      console.error("[GitHub OAuth] ❌ OAuth callback failed at step:", error);
      console.error("[GitHub OAuth] Error stack:", error instanceof Error ? error.stack : "No stack trace");

      return c.json({
        error: "OAuth callback failed",
        details: error instanceof Error ? error.message : String(error),
        stack: env.isProduction ? undefined : (error instanceof Error ? error.stack : undefined)
      }, 500);
    }
  };
}

export { exchangeAuthCode, fetchUserProfile, fetchUserEmails, findPrimaryEmail };

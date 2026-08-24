import { z } from "zod";
import { searchGmailSafe } from "@/lib/integrations/gmail";
import {
  getGitHubRepositories,
  getOpenIssues,
  getPullRequests,
  getRecentCommits,
} from "@/lib/integrations/github/client";
import { IntegrationError } from "@/lib/integrations/errors";
import { ensureRecentCalendarSync } from "@/lib/integrations/google/sync";

type ToolContext = { userId: string; timeZone: string };
type ToolResult = { ok: boolean; data?: unknown; error?: string; summary?: string };

function ok(data: unknown, summary?: string): ToolResult {
  return { ok: true, data, summary };
}

function fail(error: string): ToolResult {
  return { ok: false, error };
}

function wrap(error: unknown): ToolResult {
  if (error instanceof IntegrationError) return fail(error.message);
  return fail("That connection couldn’t be reached just then.");
}

export async function searchEmailsTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ query: z.string().trim().min(2).max(200) }).safeParse(args);
  if (!parsed.success) return fail("Gmail search needs a query.");
  try {
    const results = await searchGmailSafe(ctx.userId, parsed.data.query);
    return ok(
      results.map((item) => ({
        sender: item.sender,
        subject: item.subject,
        date: item.date,
        snippet: item.snippet,
        threadId: item.threadId,
      })),
      results.length === 0
        ? "No matching emails"
        : `${results.length} email${results.length === 1 ? "" : "s"} matched`
    );
  } catch (error) {
    return wrap(error);
  }
}

export async function getGitHubRepositoriesTool(ctx: ToolContext): Promise<ToolResult> {
  try {
    const repos = await getGitHubRepositories(ctx.userId);
    return ok(
      repos.map((repo) => ({
        name: repo.fullName,
        description: repo.description,
        openIssues: repo.openIssues,
        pushedAt: repo.pushedAt,
      })),
      `${repos.length} repositor${repos.length === 1 ? "y" : "ies"}`
    );
  } catch (error) {
    return wrap(error);
  }
}

export async function getRecentCommitsTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ repo: z.string().trim().max(120).optional() }).safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid repository.");
  try {
    const commits = await getRecentCommits(ctx.userId, parsed.data.repo);
    return ok(commits, `${commits.length} recent commit${commits.length === 1 ? "" : "s"}`);
  } catch (error) {
    return wrap(error);
  }
}

export async function getOpenIssuesTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ repo: z.string().trim().max(120).optional() }).safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid repository.");
  try {
    const issues = await getOpenIssues(ctx.userId, parsed.data.repo);
    return ok(issues, `${issues.length} open issue${issues.length === 1 ? "" : "s"}`);
  } catch (error) {
    return wrap(error);
  }
}

export async function getPullRequestsTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = z.object({ repo: z.string().trim().max(120).optional() }).safeParse(args ?? {});
  if (!parsed.success) return fail("Invalid repository.");
  try {
    const pulls = await getPullRequests(ctx.userId, parsed.data.repo);
    return ok(pulls, `${pulls.length} open pull request${pulls.length === 1 ? "" : "s"}`);
  } catch (error) {
    return wrap(error);
  }
}

export async function refreshCalendarIfConnected(ctx: ToolContext) {
  try {
    await ensureRecentCalendarSync(ctx.userId, ctx.timeZone);
  } catch {
    // Keep calendar tools usable from AZIO data even if Google is down.
  }
}

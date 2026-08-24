import { getCache } from "@/lib/cache/redis";
import { prisma } from "@/lib/db/prisma";
import { getAccessToken, isIntegrationConnected, markIntegrationError } from "@/lib/integrations/accounts";
import { IntegrationError } from "@/lib/integrations/errors";

async function githubFetch(userId: string, path: string) {
  const account = await getAccessToken(userId, "GITHUB");
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "AZIO",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }).catch((error) => {
    throw new IntegrationError("network", "AZIO couldn’t reach GitHub just then.", { cause: error });
  });

  if (response.status === 401) {
    await markIntegrationError(userId, "GITHUB", "GitHub needs to be reconnected.");
    throw new IntegrationError("expired", "GitHub needs to be reconnected in Settings → Integrations.");
  }
  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new IntegrationError("rate_limit", "GitHub asked AZIO to wait. Try again in a minute.");
    }
    throw new IntegrationError("permission", "AZIO doesn’t have permission for that GitHub data yet.");
  }
  if (response.status === 404) {
    throw new IntegrationError("provider", "That GitHub repository wasn’t found or isn’t visible to AZIO.");
  }
  if (!response.ok) {
    throw new IntegrationError("provider", "GitHub is unavailable right now.");
  }

  return response.json() as Promise<unknown>;
}

async function cached<T>(key: string, ttl: number, loader: () => Promise<T>) {
  const cache = getCache();
  const hit = await cache.get<T>(key);
  if (hit) return hit;
  const value = await loader();
  await cache.set(key, value, ttl);
  return value;
}

export type GitHubRepository = {
  fullName: string;
  description: string | null;
  url: string;
  pushedAt: string | null;
  openIssues: number;
  private: boolean;
};

export type GitHubCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type GitHubIssue = {
  number: number;
  title: string;
  state: string;
  url: string;
  updatedAt: string;
};

export type GitHubPullRequest = {
  number: number;
  title: string;
  state: string;
  url: string;
  updatedAt: string;
};

export async function getGitHubRepositories(userId: string): Promise<GitHubRepository[]> {
  if (!(await isIntegrationConnected(userId, "GITHUB"))) {
    throw new IntegrationError(
      "not_connected",
      "I don’t have access to your GitHub yet. Connect GitHub in Settings → Integrations."
    );
  }

  return cached(`github:repos:${userId}`, 60, async () => {
    const json = (await githubFetch(userId, "/user/repos?per_page=20&sort=pushed&affiliation=owner,collaborator")) as {
      full_name?: string;
      description?: string | null;
      html_url?: string;
      pushed_at?: string | null;
      open_issues_count?: number;
      private?: boolean;
    }[];
    return json.map((repo) => ({
      fullName: repo.full_name ?? "",
      description: repo.description ?? null,
      url: repo.html_url ?? "",
      pushedAt: repo.pushed_at ?? null,
      openIssues: repo.open_issues_count ?? 0,
      private: Boolean(repo.private),
    })).filter((repo) => repo.fullName);
  });
}

export function parseGitHubRepo(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const trimmed = value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/$/, "");
  const match = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

async function resolveRepo(userId: string, repo?: string | null) {
  const parsed = parseGitHubRepo(repo ?? undefined);
  if (parsed) return parsed;

  const linked = await prisma.project.findFirst({
    where: { userId, githubRepo: { not: null } },
    select: { githubRepo: true },
    orderBy: { updatedAt: "desc" },
  });
  if (linked?.githubRepo) return linked.githubRepo;

  const repos = await getGitHubRepositories(userId);
  return repos[0]?.fullName ?? null;
}

export async function getRecentCommits(userId: string, repo?: string | null): Promise<GitHubCommit[]> {
  const fullName = await resolveRepo(userId, repo);
  if (!fullName) {
    throw new IntegrationError("provider", "No GitHub repository is linked yet.");
  }
  return cached(`github:commits:${userId}:${fullName}`, 60, async () => {
    const json = (await githubFetch(userId, `/repos/${fullName}/commits?per_page=8`)) as {
      sha?: string;
      html_url?: string;
      commit?: { message?: string; author?: { name?: string; date?: string } };
    }[];
    return json.map((item) => ({
      sha: (item.sha ?? "").slice(0, 7),
      message: (item.commit?.message ?? "").split("\n")[0]?.slice(0, 160) ?? "",
      author: item.commit?.author?.name ?? "Unknown",
      date: item.commit?.author?.date ?? "",
      url: item.html_url ?? "",
    }));
  });
}

export async function getOpenIssues(userId: string, repo?: string | null): Promise<GitHubIssue[]> {
  const fullName = await resolveRepo(userId, repo);
  if (!fullName) {
    throw new IntegrationError("provider", "No GitHub repository is linked yet.");
  }
  return cached(`github:issues:${userId}:${fullName}`, 60, async () => {
    const json = (await githubFetch(
      userId,
      `/repos/${fullName}/issues?state=open&per_page=8`
    )) as {
      number?: number;
      title?: string;
      state?: string;
      html_url?: string;
      updated_at?: string;
      pull_request?: unknown;
    }[];
    return json
      .filter((item) => !item.pull_request)
      .map((item) => ({
        number: item.number ?? 0,
        title: item.title ?? "",
        state: item.state ?? "open",
        url: item.html_url ?? "",
        updatedAt: item.updated_at ?? "",
      }));
  });
}

export async function getPullRequests(userId: string, repo?: string | null): Promise<GitHubPullRequest[]> {
  const fullName = await resolveRepo(userId, repo);
  if (!fullName) {
    throw new IntegrationError("provider", "No GitHub repository is linked yet.");
  }
  return cached(`github:prs:${userId}:${fullName}`, 60, async () => {
    const json = (await githubFetch(
      userId,
      `/repos/${fullName}/pulls?state=open&per_page=8`
    )) as {
      number?: number;
      title?: string;
      state?: string;
      html_url?: string;
      updated_at?: string;
    }[];
    return json.map((item) => ({
      number: item.number ?? 0,
      title: item.title ?? "",
      state: item.state ?? "open",
      url: item.html_url ?? "",
      updatedAt: item.updated_at ?? "",
    }));
  });
}

export async function getGitHubRepoSnapshot(userId: string, repo: string) {
  const fullName = parseGitHubRepo(repo);
  if (!fullName) return null;
  if (!(await isIntegrationConnected(userId, "GITHUB"))) return null;

  const [commits, issues, pulls] = await Promise.all([
    getRecentCommits(userId, fullName).catch(() => [] as GitHubCommit[]),
    getOpenIssues(userId, fullName).catch(() => [] as GitHubIssue[]),
    getPullRequests(userId, fullName).catch(() => [] as GitHubPullRequest[]),
  ]);

  return {
    fullName,
    latestCommit: commits[0] ?? null,
    openIssues: issues,
    openPulls: pulls,
  };
}

export type GitHubActivityEvent = {
  type: string;
  repo: string;
  createdAt: string;
  commits: number;
};

export async function getGitHubActivityEvents(userId: string): Promise<GitHubActivityEvent[] | null> {
  if (!(await isIntegrationConnected(userId, "GITHUB"))) return null;

  return cached(`github:events:${userId}`, 60, async () => {
    const user = (await githubFetch(userId, "/user")) as { login?: string };
    if (!user.login) return [];
    const events = (await githubFetch(userId, `/users/${encodeURIComponent(user.login)}/events?per_page=50`)) as {
      type?: string;
      created_at?: string;
      repo?: { name?: string };
      payload?: { size?: number; commits?: unknown[] };
    }[];
    return events
      .filter((event) => event.created_at)
      .map((event) => ({
        type: event.type ?? "Event",
        repo: event.repo?.name ?? "",
        createdAt: event.created_at ?? "",
        commits: Array.isArray(event.payload?.commits)
          ? event.payload.commits.length
          : typeof event.payload?.size === "number"
            ? event.payload.size
            : 0,
      }));
  });
}

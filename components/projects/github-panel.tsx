import Link from "next/link";
import { Code2 } from "lucide-react";
import type {
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
} from "@/lib/integrations/github/client";

export function GitHubPanel({
  repo,
  latestCommit,
  openIssues,
  openPulls,
}: {
  repo: string;
  latestCommit: GitHubCommit | null;
  openIssues: GitHubIssue[];
  openPulls: GitHubPullRequest[];
}) {
  return (
    <section className="max-w-2xl space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center gap-2">
        <Code2 className="size-4" />
        <h2 className="text-sm font-medium">GitHub</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href={`https://github.com/${repo}`} className="hover:underline" target="_blank" rel="noreferrer">
          {repo}
        </Link>
      </p>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Latest commit</dt>
          <dd>
            {latestCommit ? (
              <Link href={latestCommit.url} className="hover:underline" target="_blank" rel="noreferrer">
                {latestCommit.message || latestCommit.sha}
              </Link>
            ) : (
              "No recent commits"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Open issues</dt>
          <dd>
            {openIssues.length === 0 ? (
              "None"
            ) : (
              <ul className="mt-1 space-y-1">
                {openIssues.slice(0, 5).map((issue) => (
                  <li key={issue.number}>
                    <Link href={issue.url} className="hover:underline" target="_blank" rel="noreferrer">
                      #{issue.number} {issue.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Open pull requests</dt>
          <dd>
            {openPulls.length === 0 ? (
              "None"
            ) : (
              <ul className="mt-1 space-y-1">
                {openPulls.slice(0, 5).map((pull) => (
                  <li key={pull.number}>
                    <Link href={pull.url} className="hover:underline" target="_blank" rel="noreferrer">
                      #{pull.number} {pull.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

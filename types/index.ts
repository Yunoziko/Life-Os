export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: "upgrade_required"; feature?: string };

export type SearchResultType = "task" | "goal" | "project" | "note" | "event" | "learning";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

export type CreateEntityType = "task" | "note" | "goal" | "project" | "habit" | "event" | "milestone" | "learning";

export type DashboardInsight = {
  body: string;
  source: "derived" | "insufficient";
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type SearchResultType = "task" | "goal" | "project" | "note" | "event";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

export type CreateEntityType = "task" | "note" | "goal" | "project";

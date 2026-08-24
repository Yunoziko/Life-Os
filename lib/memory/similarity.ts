const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "that",
  "this",
  "with",
  "my",
  "i",
  "im",
  "user",
  "about",
  "me",
]);

const SYNONYMS: Record<string, string> = {
  likes: "prefer",
  like: "prefer",
  prefers: "prefer",
  preferring: "prefer",
  preferred: "prefer",
  planning: "plan",
  plans: "plan",
  workouts: "workout",
  exercising: "workout",
  exercise: "workout",
  evenings: "evening",
  mornings: "morning",
  nights: "night",
};

const OPPOSITES: Array<[string, string]> = [
  ["morning", "evening"],
  ["morning", "night"],
  ["am", "pm"],
  ["early", "late"],
  ["weekday", "weekend"],
  ["razorpay", "stripe"],
];

const NO_STEM = new Set(["morning", "evening", "nothing", "something", "during"]);

function stem(token: string) {
  const mapped = SYNONYMS[token] ?? token;
  if (NO_STEM.has(mapped)) return mapped;
  if (mapped.endsWith("ing") && mapped.length > 7) return mapped.slice(0, -3);
  if (mapped.endsWith("ed") && mapped.length > 5) return mapped.slice(0, -2);
  if (mapped.endsWith("s") && mapped.length > 4) return mapped.slice(0, -1);
  return mapped;
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => stem(token.trim()))
    .filter((token) => token.length > 1 && !STOP.has(token));
}

export function tokenSet(text: string) {
  return new Set(tokenize(text));
}

export function jaccard(a: string, b: string) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size && !right.size) return 1;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : overlap / union;
}

export function looksContradictory(existing: string, incoming: string) {
  const left = tokenSet(existing);
  const right = tokenSet(incoming);
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  const sharedRatio = overlap / Math.max(1, Math.min(left.size, right.size));
  if (sharedRatio < 0.28) return false;
  return OPPOSITES.some(([a, b]) => (left.has(a) && right.has(b)) || (left.has(b) && right.has(a)));
}

export function keywordOverlap(query: string, content: string) {
  const q = tokenSet(query);
  const c = tokenSet(content);
  if (!q.size) return 0;
  let hits = 0;
  for (const token of q) {
    if (c.has(token) || content.toLowerCase().includes(token)) hits += 1;
  }
  return hits / q.size;
}

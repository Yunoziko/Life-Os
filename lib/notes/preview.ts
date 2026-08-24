export function notePreview(content: string, limit = 180) {
  return content.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function parseTags(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [...new Set(raw.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
}

export const EVENT_COLORS = [
  { id: "stone", label: "Stone", value: "#78716c" },
  { id: "slate", label: "Slate", value: "#64748b" },
  { id: "olive", label: "Olive", value: "#6b7c5a" },
  { id: "ink", label: "Ink", value: "#44403c" },
  { id: "clay", label: "Clay", value: "#9a6b4f" },
] as const;

export const REMINDER_OPTIONS = [
  { value: "", label: "None" },
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "1440", label: "1 day" },
] as const;

export const RECURRENCE_OPTIONS = [
  { value: "", label: "Does not repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
] as const;

export function eventAccent(color?: string | null) {
  const match = EVENT_COLORS.find((item) => item.id === color || item.value === color);
  return match?.value ?? "#78716c";
}

export function greetingForHour(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name?: string | null) {
  if (!name?.trim()) return null;
  return name.trim().split(/\s+/)[0] ?? null;
}

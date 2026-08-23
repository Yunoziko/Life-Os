function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function OverviewStats({
  completedToday,
  remainingToday,
  currentStreak,
  goalProgress,
}: {
  completedToday: number;
  remainingToday: number;
  currentStreak: number;
  goalProgress: number | null;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Completed today"
        value={completedToday}
        hint={completedToday === 0 ? "Nothing checked off yet" : "Finished so far"}
      />
      <Stat
        label="Still open"
        value={remainingToday}
        hint={remainingToday === 0 ? "No open work waiting" : "Tasks still in play"}
      />
      <Stat
        label="Current streak"
        value={currentStreak}
        hint={currentStreak === 0 ? "Log a habit to begin" : "Consecutive habit days"}
      />
      <Stat
        label="Goal progress"
        value={goalProgress === null ? "—" : `${goalProgress}%`}
        hint={goalProgress === null ? "Add a goal to track this" : "Average across active goals"}
      />
    </section>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function TodayStrip({
  completedToday,
  remainingToday,
  overdueCount,
  currentStreak,
}: {
  completedToday: number;
  remainingToday: number;
  overdueCount: number;
  currentStreak: number;
}) {
  return (
    <Sectionless>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-medium tracking-tight">Today</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat value={completedToday} label="completed" />
        <Stat value={remainingToday} label="remaining" />
        <Stat value={overdueCount} label="overdue" />
        <Stat value={currentStreak} label={currentStreak === 1 ? "day streak" : "day streak"} />
      </div>
    </Sectionless>
  );
}

function Sectionless({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
      {children}
    </section>
  );
}

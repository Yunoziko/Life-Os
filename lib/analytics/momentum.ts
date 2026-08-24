import type { MomentumAnalytics, MomentumPillar } from "@/lib/analytics/types";

export const MOMENTUM_WEIGHTS = {
  tasks: 0.3,
  goals: 0.3,
  habits: 0.25,
  projects: 0.15,
} as const;

export const MOMENTUM_FORMULA =
  "LifeOS Momentum is a workspace pulse, not a scientific score. When every pillar has data it is 30% tasks, 30% goals, 25% habits, and 15% projects. Missing pillars are omitted and the remaining weights are renormalized.";

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function taskPillarScore(input: {
  completed: number;
  created: number;
  overdue: number;
}): MomentumPillar {
  if (input.completed === 0 && input.created === 0 && input.overdue === 0) {
    return {
      key: "tasks",
      label: "Tasks",
      score: null,
      weight: MOMENTUM_WEIGHTS.tasks,
      note: "No task activity in this range.",
    };
  }
  const base =
    input.created === 0 && input.completed === 0
      ? 40
      : Math.min(100, Math.round((input.completed / Math.max(input.created, input.completed, 1)) * 100));
  const penalty = Math.min(25, input.overdue * 5);
  return {
    key: "tasks",
    label: "Tasks",
    score: clampScore(base - penalty),
    weight: MOMENTUM_WEIGHTS.tasks,
    note: `${input.completed} completed · ${input.created} created · ${input.overdue} overdue (−${penalty})`,
  };
}

export function goalPillarScore(input: { progress: number[]; behind: number; atRisk: number }): MomentumPillar {
  if (input.progress.length === 0) {
    return {
      key: "goals",
      label: "Goals",
      score: null,
      weight: MOMENTUM_WEIGHTS.goals,
      note: "No active goals.",
    };
  }
  const average = input.progress.reduce((sum, value) => sum + value, 0) / input.progress.length;
  const penalty = input.behind * 10 + input.atRisk * 5;
  return {
    key: "goals",
    label: "Goals",
    score: clampScore(average - penalty),
    weight: MOMENTUM_WEIGHTS.goals,
    note: `Average progress ${Math.round(average)}% · ${input.atRisk} at risk · ${input.behind} behind`,
  };
}

export function habitPillarScore(rate: number | null, streak: number): MomentumPillar {
  if (rate === null) {
    return {
      key: "habits",
      label: "Habits",
      score: null,
      weight: MOMENTUM_WEIGHTS.habits,
      note: "No scheduled habits in this range.",
    };
  }
  const bonus = Math.min(8, streak);
  return {
    key: "habits",
    label: "Habits",
    score: clampScore(rate + bonus * 0.4),
    weight: MOMENTUM_WEIGHTS.habits,
    note: `${rate}% of scheduled days · current streak ${streak}`,
  };
}

export function projectPillarScore(input: { percents: number[]; attention: number }): MomentumPillar {
  if (input.percents.length === 0) {
    return {
      key: "projects",
      label: "Projects",
      score: null,
      weight: MOMENTUM_WEIGHTS.projects,
      note: "No active projects.",
    };
  }
  const average = input.percents.reduce((sum, value) => sum + value, 0) / input.percents.length;
  const penalty = Math.min(20, input.attention * 8);
  return {
    key: "projects",
    label: "Projects",
    score: clampScore(average - penalty),
    weight: MOMENTUM_WEIGHTS.projects,
    note: `Average completion ${Math.round(average)}% · ${input.attention} need attention`,
  };
}

export function combineMomentum(pillars: MomentumPillar[], previousScore: number | null): MomentumAnalytics {
  const present = pillars.filter((pillar): pillar is MomentumPillar & { score: number } => pillar.score !== null);
  const weightSum = present.reduce((sum, pillar) => sum + pillar.weight, 0);
  const score =
    present.length === 0 || weightSum === 0
      ? null
      : clampScore(present.reduce((sum, pillar) => sum + pillar.score * (pillar.weight / weightSum), 0));

  return {
    score,
    previousScore,
    delta: score === null || previousScore === null ? null : score - previousScore,
    pillars,
    formula: MOMENTUM_FORMULA,
  };
}

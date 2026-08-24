import type { AnalyticsRange } from "@/lib/analytics/range";
import type { GoalTrackStatus } from "@/lib/analytics/classify";

export type AnalyticsOverview = {
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number | null;
  overdueTasks: number;
  goalsProgressed: number;
  habitsCompleted: number;
  projectsProgressed: number;
  calendarHours: number;
  githubActivity: number | null;
};

export type TaskTrendPoint = {
  date: string;
  completed: number;
};

export type HabitAnalytics = {
  overallRate: number | null;
  currentStreak: number;
  bestStreak: number;
  mostConsistent: { id: string; name: string; rate: number } | null;
  leastConsistent: { id: string; name: string; rate: number } | null;
  streakHabit: { id: string; name: string; streak: number } | null;
  heatmap: { date: string; completed: number; scheduled: number }[];
};

export type GoalAnalyticsItem = {
  id: string;
  title: string;
  progress: number;
  targetDate: string | null;
  velocity: number;
  status: GoalTrackStatus;
  expected: number | null;
  reason: string;
};

export type ProjectAnalyticsItem = {
  id: string;
  name: string;
  completed: number;
  remaining: number;
  percent: number;
  dueDate: string | null;
  attention: boolean;
  reason: string;
};

export type CalendarAnalytics = {
  connectedGoogle: boolean;
  using: "lifeos" | "lifeos+google";
  timedEvents: number;
  allDayEvents: number;
  scheduledHours: number;
  focusHours: number;
  meetingHours: number;
  freeHours: number | null;
  wakingWindow: string;
  busiestWeekday: { label: string; events: number } | null;
};

export type GitHubAnalytics = {
  connected: boolean;
  error?: string;
  commits: number;
  pullRequests: number;
  issues: number;
  repos: { name: string; events: number }[];
};

export type EmailAnalytics = {
  connected: boolean;
  error?: string;
  found: number;
  categories: { label: string; count: number }[];
  important: { subject: string; sender: string }[];
  disclaimer: string;
};

export type AnalyticsPattern = {
  body: string;
};

export type MomentumPillar = {
  key: "tasks" | "goals" | "habits" | "projects";
  label: string;
  score: number | null;
  weight: number;
  note: string;
};

export type MomentumAnalytics = {
  score: number | null;
  previousScore: number | null;
  delta: number | null;
  pillars: MomentumPillar[];
  formula: string;
};

export type LifeAnalytics = {
  range: AnalyticsRange;
  hasAnyData: boolean;
  overview: AnalyticsOverview;
  taskTrend: TaskTrendPoint[];
  habits: HabitAnalytics;
  goals: GoalAnalyticsItem[];
  projects: ProjectAnalyticsItem[];
  calendar: CalendarAnalytics;
  github: GitHubAnalytics;
  email: EmailAnalytics;
  patterns: AnalyticsPattern[];
  momentum: MomentumAnalytics;
};

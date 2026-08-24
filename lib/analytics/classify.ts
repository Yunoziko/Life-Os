import { calendarDaysUntil } from "@/lib/utils/date";

export type GoalTrackStatus = "on_track" | "at_risk" | "behind";

export function classifyGoalMomentum(input: {
  progress: number;
  targetDate: Date | null;
  createdAt: Date;
  timeZone: string;
}): { status: GoalTrackStatus; expected: number | null; reason: string } {
  const progress = Math.min(100, Math.max(0, Math.round(input.progress)));
  if (progress >= 100) {
    return { status: "on_track", expected: 100, reason: "This goal is already at 100%." };
  }

  if (!input.targetDate) {
    const daysOpen = Math.max(0, -calendarDaysUntil(input.createdAt, input.timeZone));
    if (progress === 0 && daysOpen >= 21) {
      return {
        status: "at_risk",
        expected: null,
        reason: "No target date, and progress is still 0% after 21 days.",
      };
    }
    return {
      status: "on_track",
      expected: null,
      reason: "No target date. AZIO only flags a stall after 21 days at 0%.",
    };
  }

  const totalDays = Math.max(1, -calendarDaysUntil(input.createdAt, input.timeZone) + calendarDaysUntil(input.targetDate, input.timeZone));
  const elapsedDays = Math.min(totalDays, Math.max(0, -calendarDaysUntil(input.createdAt, input.timeZone)));
  const expected = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const gap = expected - progress;
  const daysLeft = calendarDaysUntil(input.targetDate, input.timeZone);

  if (daysLeft < 0) {
    return {
      status: "behind",
      expected: 100,
      reason: `The target date has passed with ${progress}% done.`,
    };
  }
  if (gap >= 25) {
    return {
      status: "behind",
      expected,
      reason: `Progress is ${progress}% versus ${expected}% expected on a linear pace to the target.`,
    };
  }
  if (gap >= 10 || (daysLeft <= 14 && progress < 70)) {
    return {
      status: "at_risk",
      expected,
      reason:
        daysLeft <= 14 && progress < 70
          ? `The target is within 14 days and progress is ${progress}%.`
          : `Progress is ${progress}% versus ${expected}% expected on a linear pace to the target.`,
    };
  }
  return {
    status: "on_track",
    expected,
    reason: `Progress is ${progress}%, within 10 points of the ${expected}% linear pace to the target.`,
  };
}

export function goalVelocityPerWeek(progress: number, createdAt: Date, timeZone: string) {
  const daysOpen = Math.max(1, -calendarDaysUntil(createdAt, timeZone));
  return Math.round((progress / daysOpen) * 7 * 10) / 10;
}

export function projectNeedsAttention(input: {
  status: string;
  percent: number;
  dueDate: Date | null;
  total: number;
  timeZone: string;
}) {
  if (input.status === "ON_HOLD") {
    return { attention: true, reason: "This project is on hold." };
  }
  if (input.dueDate) {
    const daysLeft = calendarDaysUntil(input.dueDate, input.timeZone);
    if (daysLeft < 0 && input.percent < 100) {
      return { attention: true, reason: "The deadline has passed with work still open." };
    }
    if (daysLeft <= 14 && input.percent < 70) {
      return { attention: true, reason: "Deadline is within 14 days and completion is under 70%." };
    }
    if (input.total === 0 && daysLeft <= 30) {
      return { attention: true, reason: "A deadline is set, but there are no tasks yet." };
    }
  }
  return { attention: false, reason: "Pace looks sustainable from the current task mix." };
}

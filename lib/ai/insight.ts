import type { DashboardData } from "@/lib/db/dashboard";
import type { DashboardInsight } from "@/types";

export function deriveDashboardInsight(data: DashboardData): DashboardInsight {
  const signalCount =
    data.todayTasks.length +
    data.activeGoals.length +
    data.habits.length +
    data.upcomingEvents.length;

  if (signalCount < 2 && !data.hasAnyData) {
    return {
      source: "insufficient",
      body: "Once you add a few tasks and goals, LifeOS will start giving you personalized insights.",
    };
  }

  if (data.highPriorityToday >= 3) {
    return {
      source: "derived",
      body: `You have ${data.highPriorityToday} high-priority tasks open today. Consider finishing them before starting new work.`,
    };
  }

  if (data.overdueCount > 0) {
    return {
      source: "derived",
      body:
        data.overdueCount === 1
          ? "You have 1 overdue task. Clearing it will make the rest of the day easier to see."
          : `You have ${data.overdueCount} overdue tasks. Clearing those first will open the rest of the day.`,
    };
  }

  if (data.focus && data.remainingToday > 0) {
    return {
      source: "derived",
      body: `Keep ${data.focus.goalTitle} in view — ${data.remainingToday} ${
        data.remainingToday === 1 ? "task is" : "tasks are"
      } still open today.`,
    };
  }

  const openHabit = data.habits.find((habit) => !habit.completedToday);
  if (data.currentStreak > 0 && openHabit) {
    return {
      source: "derived",
      body: `You’re on a ${data.currentStreak}-day streak. ${openHabit.name} is still open today.`,
    };
  }

  if (data.remainingToday === 0 && data.completedToday > 0) {
    return {
      source: "derived",
      body: "Today’s listed work is done. Protect the rest of the day instead of inventing more.",
    };
  }

  if (data.upcomingEvents.length > 0 && data.remainingToday > 0) {
    return {
      source: "derived",
      body: `You have ${data.upcomingEvents.length === 1 ? "an event" : `${data.upcomingEvents.length} events`} coming up. Finish the remaining work before the next one starts.`,
    };
  }

  if (signalCount < 2) {
    return {
      source: "insufficient",
      body: "Once you add a few tasks and goals, LifeOS will start giving you personalized insights.",
    };
  }

  return {
    source: "derived",
    body: "The workspace is quiet. Stay with the next unfinished item instead of adding more.",
  };
}

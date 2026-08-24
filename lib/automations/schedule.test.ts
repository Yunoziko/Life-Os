import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateNextRun,
  formatNextRunLabel,
  formatScheduleLabel,
  scheduleIdempotencyKey,
} from "./schedule";

test("daily automation uses the user timezone instead of UTC", () => {
  const from = new Date("2026-08-24T02:00:00.000Z");
  const next = calculateNextRun({ frequency: "DAILY", time: "08:00", timeZone: "Asia/Kolkata" }, from);
  assert.equal(next.toISOString(), "2026-08-24T02:30:00.000Z");
});

test("weekly automation lands on the requested weekday in the user timezone", () => {
  const from = new Date("2026-08-24T10:00:00.000Z");
  const next = calculateNextRun(
    { frequency: "WEEKLY", time: "20:00", weekday: 0, timeZone: "Asia/Kolkata" },
    from
  );
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(next);
  assert.equal(weekday, "Sun");
  assert.ok(next.getTime() > from.getTime());
});

test("monthly automation uses the requested month day", () => {
  const from = new Date("2026-08-24T00:00:00.000Z");
  const next = calculateNextRun(
    { frequency: "MONTHLY", time: "10:00", monthDay: 1, timeZone: "UTC" },
    from
  );
  assert.equal(next.toISOString().slice(0, 13), "2026-09-01T10");
});

test("next-run calculation is DST-safe around a spring-forward boundary", () => {
  const from = new Date("2026-03-07T12:00:00.000Z");
  const next = calculateNextRun(
    { frequency: "DAILY", time: "08:00", timeZone: "America/New_York" },
    from
  );
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(next);
  assert.equal(clock, "08:00");
});

test("idempotency keys are unique per automation slot", () => {
  const at = new Date("2026-08-24T02:30:00.000Z");
  const first = scheduleIdempotencyKey("auto-1", at);
  const second = scheduleIdempotencyKey("auto-1", at);
  const other = scheduleIdempotencyKey("auto-1", new Date("2026-08-25T02:30:00.000Z"));
  assert.equal(first, second);
  assert.notEqual(first, other);
});

test("schedule labels describe daily weekly and monthly cadences", () => {
  assert.match(
    formatScheduleLabel({ frequency: "DAILY", time: "08:00", timeZone: "UTC" }),
    /Every day/
  );
  assert.match(
    formatScheduleLabel({ frequency: "WEEKLY", time: "20:00", weekday: 0, timeZone: "UTC" }),
    /Sunday/
  );
  assert.match(
    formatScheduleLabel({ frequency: "MONTHLY", time: "10:00", monthDay: 1, timeZone: "UTC" }),
    /1st/
  );
});

test("next-run labels stay in the user timezone", () => {
  const from = new Date("2026-08-24T02:00:00.000Z");
  const next = calculateNextRun({ frequency: "DAILY", time: "08:00", timeZone: "Asia/Kolkata" }, from);
  const label = formatNextRunLabel(next, "Asia/Kolkata", from);
  assert.match(label, /Today|Tomorrow|8:00/);
});

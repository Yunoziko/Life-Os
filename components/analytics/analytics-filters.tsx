"use client";

import { useRouter } from "next/navigation";
import { ANALYTICS_RANGES, type AnalyticsRangeId } from "@/lib/analytics/range";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AnalyticsFilters({
  range,
  from,
  to,
}: {
  range: AnalyticsRangeId;
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  function go(next: { range: string; from?: string; to?: string }) {
    const params = new URLSearchParams();
    params.set("range", next.range);
    if (next.range === "custom") {
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
    }
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        go({
          range: String(data.get("range") ?? "this-week"),
          from: String(data.get("from") ?? ""),
          to: String(data.get("to") ?? ""),
        });
      }}
    >
      <div className="grid min-w-[11rem] gap-1.5">
        <Label htmlFor="analytics-range">Range</Label>
        <NativeSelect
          id="analytics-range"
          name="range"
          defaultValue={range}
          onChange={(event) => {
            if (event.currentTarget.value !== "custom") {
              go({ range: event.currentTarget.value });
            }
          }}
        >
          {ANALYTICS_RANGES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {range === "custom" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="analytics-from">From</Label>
            <Input id="analytics-from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="analytics-to">To</Label>
            <Input id="analytics-to" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </>
      ) : null}
    </form>
  );
}

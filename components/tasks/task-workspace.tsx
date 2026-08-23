"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskDetail } from "@/components/tasks/task-detail";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWorkspace } from "@/components/workspace-provider";
import {
  countTaskViews,
  emptyTaskFilters,
  filterAndSortTasks,
  type DueFilter,
  type TaskSort,
  type TaskView,
} from "@/lib/tasks/filter";
import { TASK_PRIORITY_LABEL, TASK_SORTS, TASK_STATUS_LABEL, TASK_VIEWS } from "@/lib/tasks/labels";
import type { ClientTask } from "@/lib/tasks/serialize";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";

export function TaskWorkspace({
  tasks,
  projects,
  goals,
  timezone,
  defaultProjectId,
}: {
  tasks: ClientTask[];
  projects: AssignableProject[];
  goals: AssignableGoal[];
  timezone: string;
  defaultProjectId?: string;
}) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { setPageDefaults } = useWorkspace();
  const [view, setView] = useState<TaskView>("all");
  const [sort, setSort] = useState<TaskSort>("relevant");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [goalId, setGoalId] = useState("");
  const [due, setDue] = useState<DueFilter>("any");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 160);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!defaultProjectId) return;
    setPageDefaults({ projectId: defaultProjectId });
    return () => setPageDefaults(null);
  }, [defaultProjectId, setPageDefaults]);

  const filters = useMemo(
    () => ({
      ...emptyTaskFilters(),
      view,
      query: debouncedQuery,
      priority,
      status,
      projectId,
      goalId,
      due,
    }),
    [view, debouncedQuery, priority, status, projectId, goalId, due]
  );

  const visible = useMemo(
    () => filterAndSortTasks(tasks, filters, timezone, sort),
    [tasks, filters, timezone, sort]
  );
  const counts = useMemo(() => countTaskViews(tasks, timezone), [tasks, timezone]);
  const selected = visible.find((task) => task.id === selectedId) ?? null;
  const activeFilters = [priority, status, projectId && !defaultProjectId, goalId, due !== "any"].filter(
    Boolean
  ).length;

  function clearFilters() {
    setPriority("");
    setStatus("");
    setProjectId(defaultProjectId ?? "");
    setGoalId("");
    setDue("any");
  }

  function selectTask(task: ClientTask) {
    setSelectedId(task.id);
  }

  const filterFields = (
    <div className="grid gap-3">
      <FilterField label="Priority" value={priority} onChange={setPriority}>
        <option value="">Any</option>
        {Object.entries(TASK_PRIORITY_LABEL)
          .filter(([value]) => value !== "NONE")
          .map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
      </FilterField>
      <FilterField label="Status" value={status} onChange={setStatus}>
        <option value="">Any</option>
        {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterField>
      {!defaultProjectId ? (
        <FilterField label="Project" value={projectId} onChange={setProjectId}>
          <option value="">Any</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </FilterField>
      ) : null}
      <FilterField label="Goal" value={goalId} onChange={setGoalId}>
        <option value="">Any</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </FilterField>
      <FilterField label="Due date" value={due} onChange={(value) => setDue(value as DueFilter)}>
        <option value="any">Any</option>
        <option value="today">Today</option>
        <option value="upcoming">Upcoming</option>
        <option value="overdue">Overdue</option>
        <option value="none">No date</option>
      </FilterField>
      {activeFilters > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <Tabs value={view} onValueChange={(value) => setView(value as TaskView)}>
        <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
          {TASK_VIEWS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="px-3">
              {item.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[item.id]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, descriptions, projects"
            aria-label="Search tasks"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {desktop ? (
            <Popover>
              <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
                <Filter />
                Filter
                {activeFilters ? ` (${activeFilters})` : ""}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="mb-2 text-sm font-medium">Filters</p>
                {filterFields}
              </PopoverContent>
            </Popover>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
              <Filter />
              Filter
              {activeFilters ? ` (${activeFilters})` : ""}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <SlidersHorizontal />
              Sort
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as TaskSort)}>
                {TASK_SORTS.map((item) => (
                  <DropdownMenuRadioItem key={item.id} value={item.id}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateTrigger type="task" defaults={defaultProjectId ? { projectId: defaultProjectId } : undefined}>
            <Plus />
            New Task
          </CreateTrigger>
        </div>
      </div>

      <TaskPane
        tasks={tasks}
        visible={visible}
        selected={selected}
        timezone={timezone}
        projects={projects}
        goals={goals}
        defaultProjectId={defaultProjectId}
        onSelect={selectTask}
        onDeleted={() => setSelectedId(null)}
        desktop={desktop}
      />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Combine filters to narrow the list.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{filterFields}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TaskPane({
  tasks,
  visible,
  selected,
  timezone,
  projects,
  goals,
  defaultProjectId,
  onSelect,
  onDeleted,
  desktop = false,
}: {
  tasks: ClientTask[];
  visible: ClientTask[];
  selected: ClientTask | null;
  timezone: string;
  projects: AssignableProject[];
  goals: AssignableGoal[];
  defaultProjectId?: string;
  onSelect: (task: ClientTask) => void;
  onDeleted: () => void;
  desktop?: boolean;
}) {
  const list = (
    <div className="min-w-0">
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet."
          description="Clear your mind and capture what needs to be done."
          action={<CreateTrigger type="task" defaults={defaultProjectId ? { projectId: defaultProjectId } : undefined}>Create task</CreateTrigger>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches."
          description="Try a different view, filter, or search."
        />
      ) : (
        <ul className="space-y-0.5">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              timezone={timezone}
              selected={selected?.id === task.id}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );

  if (!desktop) {
    return (
      <>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-2">{list}</div>
        <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && onDeleted()}>
          <SheetContent side="right" className="w-full max-w-none sm:max-w-none">
            <SheetHeader className="sr-only">
              <SheetTitle>{selected?.title ?? "Task"}</SheetTitle>
              <SheetDescription>Task details</SheetDescription>
            </SheetHeader>
            {selected ? (
              <TaskDetail
                task={selected}
                timezone={timezone}
                projects={projects}
                goals={goals}
                lockProject={Boolean(defaultProjectId)}
                onDeleted={onDeleted}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,22rem)]">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-2">{list}</div>
      <aside className="min-h-80 rounded-xl border border-border/60 bg-background/60">
        {selected ? (
          <TaskDetail
            task={selected}
            timezone={timezone}
            projects={projects}
            goals={goals}
            lockProject={Boolean(defaultProjectId)}
            onDeleted={onDeleted}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Select a task to see details.
          </div>
        )}
      </aside>
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </div>
  );
}

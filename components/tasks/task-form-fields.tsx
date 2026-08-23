import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/tasks/labels";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";

export type TaskFormValues = {
  title?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  dueDate?: string;
  dueTime?: string;
  projectId?: string | null;
  goalId?: string | null;
};

export function TaskFormFields({
  values,
  projects,
  goals,
  includeStatus = false,
  autoFocus = true,
  lockProject = false,
  lockGoal = false,
}: {
  values?: TaskFormValues;
  projects: AssignableProject[];
  goals: AssignableGoal[];
  includeStatus?: boolean;
  autoFocus?: boolean;
  lockProject?: boolean;
  lockGoal?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          name="title"
          defaultValue={values?.title}
          placeholder="Write weekly review"
          required
          autoFocus={autoFocus}
          maxLength={160}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          placeholder="Optional context"
        />
      </div>

      <div className={includeStatus ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <div className="grid gap-2">
          <Label htmlFor="task-priority">Priority</Label>
          <NativeSelect id="task-priority" name="priority" defaultValue={values?.priority ?? "NONE"}>
            {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {includeStatus ? (
          <div className="grid gap-2">
            <Label htmlFor="task-status">Status</Label>
            <NativeSelect id="task-status" name="status" defaultValue={values?.status ?? "TODO"}>
              {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="task-due-date">Due date</Label>
          <Input id="task-due-date" name="dueDate" type="date" defaultValue={values?.dueDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-due-time">Due time</Label>
          <Input id="task-due-time" name="dueTime" type="time" defaultValue={values?.dueTime} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="task-project">Project</Label>
          {lockProject ? <input type="hidden" name="projectId" value={values?.projectId ?? ""} /> : null}
          <NativeSelect
            id="task-project"
            name={lockProject ? undefined : "projectId"}
            defaultValue={values?.projectId ?? ""}
            disabled={lockProject}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-goal">Goal</Label>
          {lockGoal ? <input type="hidden" name="goalId" value={values?.goalId ?? ""} /> : null}
          <NativeSelect
            id="task-goal"
            name={lockGoal ? undefined : "goalId"}
            defaultValue={values?.goalId ?? ""}
            disabled={lockGoal}
          >
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { PROJECT_COLORS, PROJECT_ICONS, PROJECT_STATUS_LABEL } from "@/lib/projects/labels";

export type ProjectFormValues = {
  name?: string;
  description?: string | null;
  status?: string;
  color?: string | null;
  icon?: string | null;
  startDate?: string;
  dueDate?: string;
  githubRepo?: string | null;
};

export function ProjectFormFields({
  values,
  autoFocus = true,
}: {
  values?: ProjectFormValues;
  autoFocus?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          name="name"
          defaultValue={values?.name}
          placeholder="LifeOS"
          required
          autoFocus={autoFocus}
          maxLength={160}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          placeholder="What this body of work is for"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="project-status">Status</Label>
          <NativeSelect id="project-status" name="status" defaultValue={values?.status ?? "ACTIVE"}>
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-icon">Icon</Label>
          <NativeSelect id="project-icon" name="icon" defaultValue={values?.icon ?? "folder"}>
            {PROJECT_ICONS.map((icon) => (
              <option key={icon.id} value={icon.id}>
                {icon.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project color">
          {PROJECT_COLORS.map((color) => (
            <label key={color.id} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={color.value}
                defaultChecked={(values?.color ?? PROJECT_COLORS[0].value) === color.value}
                className="peer sr-only"
              />
              <span
                className="block size-6 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
              <span className="sr-only">{color.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="project-start">Start date</Label>
          <Input id="project-start" name="startDate" type="date" defaultValue={values?.startDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-due">Due date</Label>
          <Input id="project-due" name="dueDate" type="date" defaultValue={values?.dueDate} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project-github">GitHub repository (optional)</Label>
        <Input
          id="project-github"
          name="githubRepo"
          defaultValue={values?.githubRepo ?? ""}
          placeholder="owner/name"
        />
        <p className="text-xs text-muted-foreground">
          Link a repository to show recent commits, issues, and pull requests. Not required.
        </p>
      </div>
    </div>
  );
}

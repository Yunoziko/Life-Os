import { revalidatePath } from "next/cache";

export function revalidateWorkspace(paths: string[] = []) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    revalidatePath("/projects");
    revalidatePath("/goals");
    revalidatePath("/notes");
    revalidatePath("/calendar");
    revalidatePath("/habits");
    revalidatePath("/learning");
    revalidatePath("/settings");
    revalidatePath("/settings/billing");
    revalidatePath("/settings/memory");
    revalidatePath("/pricing");
    revalidatePath("/analytics");
    revalidatePath("/ai");
    revalidatePath("/automations");
    revalidatePath("/notifications");
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // no-op when called outside a Next.js request
  }
}

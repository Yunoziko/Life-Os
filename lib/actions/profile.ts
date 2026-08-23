"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/validations/auth";
import type { ActionResult } from "@/types";

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Could not save profile." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.displayName },
    }),
    prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        displayName: parsed.data.displayName,
        timezone: parsed.data.timezone,
        bio: parsed.data.bio || null,
      },
      create: {
        userId: user.id,
        displayName: parsed.data.displayName,
        timezone: parsed.data.timezone,
        bio: parsed.data.bio || null,
      },
    }),
  ]);

  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

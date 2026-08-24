"use server";

import { AuthError } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { signIn, signOut } from "@/auth";
import type { ActionResult } from "@/types";
import { safeInternalPath } from "@/lib/security/http";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  try {
    await assertRateLimit("auth.login", parsed.data.email.toLowerCase());
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const callbackUrl = safeInternalPath(formData.get("callbackUrl"), "/dashboard");

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Incorrect email or password." };
    }
    throw error;
  }
}

export async function signupAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await assertRateLimit("auth.signup", email);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      profile: {
        create: {
          displayName: parsed.data.name,
        },
      },
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Account created. Please sign in." };
    }
    throw error;
  }
}

export async function googleSignInAction(callbackUrl?: string) {
  await signIn("google", {
    redirectTo: safeInternalPath(callbackUrl, "/dashboard"),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

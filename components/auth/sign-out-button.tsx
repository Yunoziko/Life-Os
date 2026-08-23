"use client";

import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button type="button" variant="outline" onClick={() => void signOutAction()}>
      Log out
    </Button>
  );
}

import type { NextAuthConfig } from "next-auth";
import { isProtectedPath } from "@/lib/navigation";
import { runtimeEnv } from "@/lib/env/runtime";

export const authConfig = {
  trustHost: true,
  secret: runtimeEnv("AUTH_SECRET"),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      if (isProtectedPath(pathname)) {
        return isLoggedIn;
      }

      if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

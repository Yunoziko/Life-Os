import type { NextAuthConfig } from "next-auth";
import { isProtectedPath } from "@/lib/navigation";

export const authConfig = {
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

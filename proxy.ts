import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { isProtectedPath } from "@/lib/navigation";
import { createRequestId } from "@/lib/security/http";

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);
  const requestId = request.headers.get("x-request-id") || createRequestId();

  const applyId = (response: NextResponse) => {
    response.headers.set("x-request-id", requestId);
    return response;
  };

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applyId(NextResponse.redirect(loginUrl));
  }

  if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
    return applyId(NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin)));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  return applyId(
    NextResponse.next({
      request: { headers: requestHeaders },
    })
  );
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

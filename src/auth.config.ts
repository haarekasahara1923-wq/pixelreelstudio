import type { NextAuthConfig } from "next-auth";

// This config is Edge-Runtime safe — no Node.js-only imports (no bcrypt, no DB).
// It is ONLY used by middleware.ts for session checking.
export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");
      const isDashboardRoute =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/generate") ||
        nextUrl.pathname.startsWith("/history") ||
        nextUrl.pathname.startsWith("/credits");
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");

      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

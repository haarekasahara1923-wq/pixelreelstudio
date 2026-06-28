import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;

  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/generate") || nextUrl.pathname.startsWith("/history") || nextUrl.pathname.startsWith("/credits");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect unauthenticated users away from protected pages
  if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Redirect non-admins away from admin pages
  if (isLoggedIn && isAdminRoute && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

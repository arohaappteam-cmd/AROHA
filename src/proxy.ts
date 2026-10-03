import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session fresh and sends signed-out visitors to /login.
 *
 * This is the optimistic check; `getCurrentUser()` verifies again on every
 * page and action, so nothing relies on the proxy alone. Reads process.env
 * directly — the proxy runs apart from the app and can't use `server-only`.
 */

/** Reachable without an account. */
function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const mode = process.env.AUTH_MODE ?? (url && key ? "supabase" : "local");
  if (mode !== "supabase" || !url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    // Carry any refreshed session cookies across the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return redirectTo(login);
  }
  if (signedIn && pathname === "/login") {
    return redirectTo(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, icons, the web manifest, image
    // optimisation and the health check.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

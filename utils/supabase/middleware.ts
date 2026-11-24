import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const protectedPathPrefixes = [
  "/employees",
  "/employee-profile",
  "/biometric-enrollment",
  "/face-biometric-attendance",
  "/attendance",
  "/attendance-productivity",
  "/employee-report-ticket",
  "/feedback-reward",
  "/home",
];

function isProtectedPath(pathname: string) {
  return protectedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            void options;
            request.cookies.set(name, value);
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  // getUser validates the access token and refreshes the response cookies when
  // needed. Do not use getSession here because it does not validate the token.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const redirectToLogin = (reason?: string) => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = reason ? `?reason=${reason}` : "";
    const response = NextResponse.redirect(loginUrl);

    // Keep cookies refreshed or cleared by the SSR Supabase adapter when the
    // redirect response replaces the in-progress response.
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (isProtectedPath(pathname) && !user) {
    return redirectToLogin();
  }

  if (isProtectedPath(pathname) && user) {
    const { data, error } = await supabase.rpc("d3_get_idle_session_status");
    const idleSession = Array.isArray(data) ? data[0] as { status?: string } | undefined : undefined;

    // Do not evict a valid user during a transient API failure. A concrete
    // non-ACTIVE status is enforced server-side on every protected route.
    if (!error && idleSession?.status && idleSession.status !== "ACTIVE") {
      await supabase.auth.signOut({ scope: "local" });
      const reason = idleSession.status === "LOCATION_UNMAPPED"
        ? "location"
        : idleSession.status === "PROFILE_UNAVAILABLE"
          ? "profile"
          : "idle";
      return redirectToLogin(reason);
    }
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/face-biometric-attendance";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return supabaseResponse;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
];

const PUBLIC_PREFIXES = [
  "/_next",
  "/images",
  "/logo",
  "/icons",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  /* =========================================================
     Ignorar recursos públicos
  ========================================================= */

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

  /* =========================================================
     Se for recurso público não verificar auth
  ========================================================= */

  if (isPublic) {
    return response;
  }

  /* =========================================================
     Supabase SSR Client
  ========================================================= */

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              response.cookies.set(
                name,
                value,
                options
              )
          );
        },
      },
    }
  );

  /* =========================================================
     Verificar utilizador
  ========================================================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* =========================================================
     Não autenticado
  ========================================================= */

  if (!user) {
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "next",
      pathname + request.nextUrl.search
    );

    return NextResponse.redirect(loginUrl);
  }

  /* =========================================================
     Já autenticado → impedir login/register
  ========================================================= */

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

/* =========================================================
   Matcher
========================================================= */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
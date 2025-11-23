import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

/* -------  Middleware entrypoint  ------- */
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");
  const isTrpc = pathname.startsWith("/api/trpc");

  const preflightHeaders =
    req.headers.get("access-control-request-headers")?.toLowerCase() ?? "";
  const isDesktopPreflight =
    preflightHeaders.includes("x-df-client") ||
    preflightHeaders.includes("x-api-key") ||
    preflightHeaders.includes("x-trpc-source") ||
    preflightHeaders.includes("trpc-accept");

  if (!isApi && !isTrpc) {
    const response = NextResponse.next();

    if (!isDesktopPreflight) {
      const clerkRes = await clerkMiddleware()(req, ev);
      if (clerkRes) {
        return clerkRes;
      }
    }

    return response;
  }

  if (isApi || isTrpc) {
    const origin = req.headers.get("origin");

    // const isLocalhost = origin?.startsWith("http://localhost:3001");

    // Allow production domain or any localhost origin, and handle preflight
    // Keeping for now since we will support arbitrary origins in future
    // if (origin === "https://app.deepfi.sh" || isLocalhost) {
    //   const res =
    //     req.method === "OPTIONS"
    //       ? new Response(null, { status: 204 })
    //       : NextResponse.next();

    //   // Echo back the requesting origin when allowed to satisfy CORS with credentials
    //   res.headers.set(
    //     "Access-Control-Allow-Origin",
    //     origin ?? "https://app.deepfi.sh",
    //   );
    //   res.headers.set("Access-Control-Allow-Credentials", "true");
    //   res.headers.set(
    //     "Access-Control-Allow-Methods",
    //     "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    //   );
    //   res.headers.set(
    //     "Access-Control-Allow-Headers",
    //     "Content-Type,Authorization,x-api-key,x-df-client,x-trpc-source,trpc-accept",
    //   );

    //   return res;
    // }
  }

  /* Skip Clerk when it's desktop or its pre-flight */
  if (!isDesktopPreflight) {
    const res = await clerkMiddleware()(req, ev);
    if (res) return res;
  }

  /* -------------------------------------------------
   * 2.  CORS for API-token calls or pre-flights
   * -------------------------------------------------
   */
  if (isApi) {
    const res = NextResponse.next();
    const origin = req.headers.get("origin") ?? "*";
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    );
    res.headers.set("x-api-key", req.headers.get("x-api-key") ?? "");
    res.headers.set(
      "Access-Control-Allow-Headers",
      req.headers.get("Access-Control-Request-Headers") ?? "*",
    );

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: res.headers });
    }
    return res;
  }

  // Static files, pages, etc.—just continue
  return NextResponse.next();
}

/* Run on everything so we can handle i18n routing and inspect headers */
export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

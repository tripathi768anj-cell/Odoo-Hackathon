import { NextRequest, NextResponse } from "next/server";

// Cheap edge-level redirect. This is defense-in-depth only — it just checks whether a
// refresh_token cookie is present, it cannot validate it (that requires a network round
// trip to the backend). Real enforcement is the client-side auth guard in
// app/(app)/layout.tsx plus the backend returning 401s on every protected API call.
const PROTECTED_PREFIXES = ["/dashboard", "/quotations", "/quote-builder", "/approvals", "/approval-detail", "/fulfillment", "/fulfillment-detail", "/subscriptions", "/billing-detail", "/customer-portal", "/invoices", "/invoice-detail", "/deal-health", "/reports", "/products", "/product-detail", "/discount-setup"];

const PUBLIC_ONLY_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("refresh_token");

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (PUBLIC_ONLY_PATHS.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

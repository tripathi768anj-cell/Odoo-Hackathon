import { NextResponse } from "next/server";

export function proxy() {
  // Refresh cookies are issued by the API origin. Client-side AuthGate performs
  // the authoritative session check, so an edge cookie check can race login.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

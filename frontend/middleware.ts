import { NextResponse } from "next/server";

export function middleware() {
  // Since we are mocking auth state entirely on the client-side for this demo,
  // we won't strictly block routes in Edge middleware (which doesn't share React Context).
  // In a real app with Sanctum/JWT, we would verify the session cookie/token here.
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};


import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match all paths except static files, Next.js internals, and public docsite
    "/((?!_next/static|_next/image|favicon.ico|golems(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|xml|txt|md|woff2?)$).*)",
  ],
};

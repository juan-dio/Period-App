<<<<<<< HEAD
=======
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
>>>>>>> 580064ad89ba22ceabe715af53c8382758716fc1
import { authMiddleware } from "./lib/supabase/middleware";

export async function proxy(req) {
  return authMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

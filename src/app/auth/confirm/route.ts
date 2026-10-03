import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/server/auth/redirects";
import { createSupabaseServerClient } from "@/server/auth/supabase";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Where the links in sign-up and password-reset emails land. Handles both
 * shapes Supabase sends: `token_hash` + `type` (works in any browser) and a
 * PKCE `code` (works in the browser that asked for the email).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (ok) return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, request.url));
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}

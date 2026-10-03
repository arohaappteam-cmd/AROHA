import { z } from "zod";

/**
 * Sign-in form contracts, checked in the browser before anything reaches
 * Supabase. Supabase enforces its own rules too (set its minimum password
 * length to match — see DEPLOYMENT.md).
 */

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt, which Supabase uses, ignores anything past 72 bytes.
export const MAX_PASSWORD_LENGTH = 72;

const email = z.email("Enter a valid email address").trim().toLowerCase().max(254);
const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`);

export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(MAX_PASSWORD_LENGTH) });
export const signUpSchema = z.object({ displayName: z.string().trim().min(1, "Tell us what to call you").max(60), email, password: newPassword });
export const resetRequestSchema = z.object({ email });
export const newPasswordSchema = z.object({ password: newPassword });

/** Supabase Auth error codes, in words a person can act on. */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match.";
    case "email_not_confirmed":
      return "Confirm your email first — the link is in your inbox.";
    case "weak_password":
      return `Choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters, not a common one.`;
    case "same_password":
      return "Choose a password you haven't used here before.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts just now. Wait a few minutes and try again.";
    case "signup_disabled":
      return "New sign-ups are closed right now.";
    default:
      return fallback;
  }
}

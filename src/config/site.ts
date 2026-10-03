export const siteConfig = {
  name: "AROHA",
  tagline: "Turn everyday life into an evolving RPG.",
  description:
    "AI-powered real-life personal growth and progression system. The game is your real life.",
} as const;

/**
 * Handle of the single local user, used when Supabase Auth is off (local
 * development, or AUTH_MODE=local). See src/server/auth/current-user.ts.
 */
export const LOCAL_USER_HANDLE = "local";
export const LOCAL_USER_DEFAULT_NAME = "Adventurer";

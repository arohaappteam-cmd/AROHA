import type { Instrumentation } from "next";

/**
 * Every server error, as one structured line in the host's logs (Render →
 * Logs), keyed by the same digest the error page shows as "Ref". Optionally
 * also posted to a chat webhook (Discord or Slack) via ERROR_WEBHOOK_URL.
 *
 * Deliberately left out: query strings (email links carry one-time tokens),
 * headers and cookies (sessions), and request bodies (journal text).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const failure = error instanceof Error ? error : new Error(String(error));
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  const report = {
    level: "error",
    at: new Date().toISOString(),
    digest,
    message: failure.message,
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    kind: context.routeType,
    stack: failure.stack?.split("\n").slice(0, 6).join("\n"),
  };
  console.error(JSON.stringify(report));

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;
  const text = `AROHA error${digest ? ` (ref ${digest})` : ""} on ${report.method} ${report.route}: ${report.message}`.slice(0, 1800);
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Discord reads `content`, Slack reads `text`.
      body: JSON.stringify({ content: text, text }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Reporting must never become a second failure.
  }
};

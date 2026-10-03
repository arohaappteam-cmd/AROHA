import path from "node:path";

import type { NextConfig } from "next";

/**
 * Sent with every response. The CSP is deliberately narrow — it governs
 * framing, forms, plugins and <base>, not scripts — so it can't break
 * Next's own inline scripts while still stopping clickjacking and
 * form hijacking.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browsers only honour this over HTTPS, so it's inert on localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root: a stray lockfile higher up the filesystem otherwise
    // confuses workspace-root detection.
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

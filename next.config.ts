import type { NextConfig } from "next";

// CLAUDE.md: "Security headers: Content Security Policy, HSTS,
// X-Frame-Options and secure, HTTP-only cookies." (Cookies themselves are
// handled by @supabase/ssr's own secure defaults, not here.)
//
// Nothing in this app loads a script, style, image or frame from anywhere
// but itself -- there's no client-side Supabase/Google fetch, no embedded
// third-party widgets -- so the policy stays this tight rather than
// allowlisting origins nothing actually uses.
//
// script-src needs 'unsafe-inline': Next.js injects its own inline
// hydration/bootstrap scripts, so a strict nonce-free script-src would
// break every page. 'self' still blocks loading any script from an
// untrusted external origin, the more common injection vector, and
// nothing here uses dangerouslySetInnerHTML to put attacker-controlled
// markup on the page in the first place. Full nonce-based hardening is a
// known gap. 'unsafe-eval' is added in dev only -- React's dev-mode
// debugging tools (component stack reconstruction) use eval(); production
// React never does.
const scriptSrc = `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Lead imports (app/import/actions.ts) send the uploaded CSV/TSV/Excel
  // file straight to a Server Action. Next.js caps Server Action request
  // bodies at 1MB by default -- nowhere near lib/import/csv.ts's own
  // MAX_IMPORT_FILE_BYTES (10MB), so any real-world file upload was
  // silently rejected before validation ever got a chance to run. Matches
  // that same 10MB limit so the app's one stated size limit is consistent.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Prisma's generated client (output path: lib/generated/prisma, set in
  // prisma/schema.prisma) loads its query engine binary dynamically at
  // runtime via fs, not a static import -- Next.js's file tracer only
  // follows static imports/requires, so on Vercel it silently left the
  // .so.node binary out of every serverless function's bundle even
  // though the binary exists in the build output. This forces it in.
  outputFileTracingIncludes: {
    "/**": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;

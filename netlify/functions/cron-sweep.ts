import type { Config } from "@netlify/functions";

/**
 * Netlify's free-tier Scheduled Functions run on any cron interval (unlike
 * Vercel Hobby's cron, which is capped at once a day) -- but Netlify invokes
 * this function directly, with no way to attach our own Authorization
 * header. So this is a thin shim: it calls the real sweep logic at
 * /api/cron/due-steps over HTTP, supplying the same Bearer token that route
 * already checks, rather than re-implementing the sweep here.
 */
async function cronSweep() {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    return new Response("Missing URL or CRON_SECRET", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/cron/due-steps`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  return new Response(body, { status: response.status });
}

export default cronSweep;

export const config: Config = {
  schedule: "*/15 * * * *",
};

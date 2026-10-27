/**
 * Browsers may call the AI functions only from ChemQuest itself: the Vercel deployments of this
 * project and local development. Extra origins (a custom domain) come from ALLOWED_ORIGINS,
 * comma separated. The native app sends no Origin; signing in is what protects the functions.
 */
const BUILT_IN = [
  /^https:\/\/pinequest-s5-episode-2-team-5(-[a-z0-9-]+)?\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

export function allowedOrigin(origin: string | null, extra = ''): boolean {
  if (!origin) return false;
  const listed = extra.split(',').map((o) => o.trim()).filter(Boolean);
  return listed.includes(origin) || BUILT_IN.some((pattern) => pattern.test(origin));
}

export function corsHeaders(origin: string | null, extra = ''): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowedOrigin(origin, extra)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

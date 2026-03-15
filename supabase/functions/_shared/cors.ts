const ALLOWED_ORIGINS = [
  "https://edartpolska.pl",
  "https://ace-darts-arena.vercel.app",
  "https://ace-darts-arena.lovable.app",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  // Allow whitelisted web origins and browser extension origins
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://");
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

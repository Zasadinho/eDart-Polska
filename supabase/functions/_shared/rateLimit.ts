// ─── Rate limiting helper for edge functions ───
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
}

/**
 * Check rate limit for a user action.
 * Uses the database check_rate_limit function.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests = 10,
  windowMinutes = 1,
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_user_id: userId,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_minutes: windowMinutes,
  });

  if (error) {
    // If rate limit check fails, allow (fail open) but log
    console.error("Rate limit check failed:", error.message);
    return { allowed: true };
  }

  return { allowed: data === true };
}

/** Return a 429 response with rate limit headers */
export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}

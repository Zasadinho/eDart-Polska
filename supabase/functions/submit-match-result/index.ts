import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { safeStat, safeAvg, isUuid } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth — require logged-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is admin/moderator
    const { data: isAdminOrMod } = await supabase.rpc("is_moderator_or_admin", { _user_id: userId });

    // Get player record for this user
    const { data: playerData } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const playerId = playerData?.id;

    // Parse body
    const body = await req.json();
    const {
      match_id,
      // Alternative: find match by player names or autodarts match ID
      player1_name,
      player2_name,
      league_id,
      // Match data
      score1,
      score2,
      avg1,
      avg2,
      one_eighties1 = 0,
      one_eighties2 = 0,
      high_checkout1 = 0,
      high_checkout2 = 0,
      ton60_1 = 0,
      ton60_2 = 0,
      ton80_1 = 0,
      ton80_2 = 0,
      ton_plus1 = 0,
      ton_plus2 = 0,
      ton40_1 = 0,
      ton40_2 = 0,
      darts_thrown1 = 0,
      darts_thrown2 = 0,
      checkout_attempts1 = 0,
      checkout_attempts2 = 0,
      checkout_hits1 = 0,
      checkout_hits2 = 0,
      first_9_avg1,
      first_9_avg2,
      autodarts_link,
      // If admin wants to auto-complete
      auto_complete = false,
    } = body;

    if (score1 === undefined || score2 === undefined) {
      return new Response(JSON.stringify({ error: "score1 and score2 are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match_id && !isUuid(match_id)) {
      return new Response(JSON.stringify({ error: "Invalid match_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (league_id && !isUuid(league_id)) {
      return new Response(JSON.stringify({ error: "Invalid league_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the match
    let matchId = match_id;

    if (!matchId && player1_name && player2_name) {
      // Try to find an upcoming match by player names
      const { data: matchByNames } = await supabase
        .from("matches")
        .select("id, player1_id, player2_id, players!matches_player1_id_fkey(name), p2:players!matches_player2_id_fkey(name)")
        .eq("status", "upcoming")
        .limit(100);

      if (matchByNames) {
        const found = matchByNames.find((m: any) => {
          const p1 = m.players?.name?.toLowerCase();
          const p2 = m.p2?.name?.toLowerCase();
          const n1 = player1_name.toLowerCase();
          const n2 = player2_name.toLowerCase();
          return (p1 === n1 && p2 === n2) || (p1 === n2 && p2 === n1);
        });
        if (found) matchId = found.id;
      }
    }

    if (!matchId) {
      return new Response(JSON.stringify({ error: "Match not found. Provide match_id or player1_name + player2_name." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the match exists and user has permission
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check
    const isParticipant = playerId && (match.player1_id === playerId || match.player2_id === playerId);
    if (!isAdminOrMod && !isParticipant) {
      return new Response(JSON.stringify({ error: "You are not a participant in this match" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine status
    const newStatus = (auto_complete && isAdminOrMod) ? "completed" : "pending_approval";

    // Sanitize all numeric stats before writing to DB
    const s = {
      score1: safeStat(score1, 50),
      score2: safeStat(score2, 50),
      avg1: safeAvg(avg1),
      avg2: safeAvg(avg2),
      one_eighties1: safeStat(one_eighties1, 100),
      one_eighties2: safeStat(one_eighties2, 100),
      high_checkout1: safeStat(high_checkout1, 170),
      high_checkout2: safeStat(high_checkout2, 170),
      ton60_1: safeStat(ton60_1, 200),
      ton60_2: safeStat(ton60_2, 200),
      ton80_1: safeStat(ton80_1, 200),
      ton80_2: safeStat(ton80_2, 200),
      ton_plus1: safeStat(ton_plus1, 200),
      ton_plus2: safeStat(ton_plus2, 200),
      ton40_1: safeStat(ton40_1, 200),
      ton40_2: safeStat(ton40_2, 200),
      darts_thrown1: safeStat(darts_thrown1, 9999),
      darts_thrown2: safeStat(darts_thrown2, 9999),
      checkout_attempts1: safeStat(checkout_attempts1, 500),
      checkout_attempts2: safeStat(checkout_attempts2, 500),
      checkout_hits1: safeStat(checkout_hits1, 500),
      checkout_hits2: safeStat(checkout_hits2, 500),
      first_9_avg1: safeAvg(first_9_avg1),
      first_9_avg2: safeAvg(first_9_avg2),
    };

    // Update match
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        score1: s.score1,
        score2: s.score2,
        legs_won1: s.score1,
        legs_won2: s.score2,
        status: newStatus,
        is_walkover: false,
        avg1: s.avg1,
        avg2: s.avg2,
        one_eighties1: s.one_eighties1,
        one_eighties2: s.one_eighties2,
        high_checkout1: s.high_checkout1,
        high_checkout2: s.high_checkout2,
        ton60_1: s.ton60_1,
        ton60_2: s.ton60_2,
        ton80_1: s.ton80_1,
        ton80_2: s.ton80_2,
        ton_plus1: s.ton_plus1,
        ton_plus2: s.ton_plus2,
        ton40_1: s.ton40_1,
        ton40_2: s.ton40_2,
        darts_thrown1: s.darts_thrown1,
        darts_thrown2: s.darts_thrown2,
        checkout_attempts1: s.checkout_attempts1,
        checkout_attempts2: s.checkout_attempts2,
        checkout_hits1: s.checkout_hits1,
        checkout_hits2: s.checkout_hits2,
        first_9_avg1: s.first_9_avg1,
        first_9_avg2: s.first_9_avg2,
        autodarts_link: autodarts_link ?? null,
      })
      .eq("id", matchId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        match_id: matchId,
        status: newStatus,
        message: newStatus === "completed"
          ? "Match completed and approved."
          : "Match result submitted, awaiting admin approval.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

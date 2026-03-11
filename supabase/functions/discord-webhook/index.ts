import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action, match_data } = body;

    // For send_match_result called internally, skip user auth
    if (action === "send_match_result") {
      return await handleSendMatchResult(supabaseUrl, serviceRoleKey, match_data);
    }

    // All other actions require admin auth
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { data: isAdmin } = await supabase.rpc("is_moderator_or_admin", { _user_id: user.id });
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "save_webhook") {
      const { id, league_id, webhook_url, enabled, label } = body;
      
      if (webhook_url && !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
        return jsonResponse({ error: "Invalid Discord webhook URL" }, 400);
      }

      if (id) {
        // Update existing
        const { error } = await adminSupabase
          .from("discord_webhooks")
          .update({ webhook_url, enabled, label, league_id: league_id || null, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await adminSupabase
          .from("discord_webhooks")
          .insert({ webhook_url, enabled, label, league_id: league_id || null });
        if (error) throw error;
      }

      return jsonResponse({ success: true });
    }

    if (action === "delete_webhook") {
      const { id } = body;
      const { error } = await adminSupabase.from("discord_webhooks").delete().eq("id", id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "test") {
      const { webhook_url } = body;
      if (!webhook_url) {
        return jsonResponse({ error: "Podaj webhook URL" }, 400);
      }

      const embed = {
        title: "🎯 eDART Polska — Test",
        description: "Połączenie z Discordem działa poprawnie! ✅",
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: { text: "eDART Polska" },
      };

      const discordRes = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        return jsonResponse({ error: `Discord error: ${errText}` }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Discord webhook error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

async function handleSendMatchResult(supabaseUrl: string, serviceRoleKey: string, matchData: any) {
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  const { match_id } = matchData || {};
  if (!match_id) return jsonResponse({ error: "match_id required" }, 400);

  const { data: match } = await adminSupabase.from("matches").select("*").eq("id", match_id).single();
  if (!match) return jsonResponse({ error: "Match not found" }, 404);

  // Get all enabled webhooks for this league + global ones (league_id IS NULL)
  const { data: webhooks } = await adminSupabase
    .from("discord_webhooks")
    .select("*")
    .eq("enabled", true)
    .or(`league_id.eq.${match.league_id},league_id.is.null`);

  if (!webhooks || webhooks.length === 0) {
    return jsonResponse({ success: false, reason: "No active webhooks" });
  }

  const { data: p1 } = await adminSupabase.rpc("get_player_public_info", { p_id: match.player1_id });
  const { data: p2 } = await adminSupabase.rpc("get_player_public_info", { p_id: match.player2_id });
  const { data: league } = await adminSupabase.from("leagues").select("name, season, format").eq("id", match.league_id).single();

  const p1Name = p1?.[0]?.name || "Gracz 1";
  const p2Name = p2?.[0]?.name || "Gracz 2";
  const leagueName = league ? `${league.name} — ${league.season}` : "Liga";
  const isWalkover = match.is_walkover;
  const winner = (match.score1 ?? 0) > (match.score2 ?? 0) ? p1Name : p2Name;

  const statsLines: string[] = [];
  if (match.avg1 != null || match.avg2 != null) statsLines.push(`📊 Średnia: ${Number(match.avg1 ?? 0).toFixed(1)} / ${Number(match.avg2 ?? 0).toFixed(1)}`);
  if ((match.one_eighties1 ?? 0) > 0 || (match.one_eighties2 ?? 0) > 0) statsLines.push(`🎯 180s: ${match.one_eighties1 ?? 0} / ${match.one_eighties2 ?? 0}`);
  if ((match.high_checkout1 ?? 0) > 0 || (match.high_checkout2 ?? 0) > 0) statsLines.push(`✅ High CO: ${match.high_checkout1 ?? 0} / ${match.high_checkout2 ?? 0}`);
  if (match.darts_thrown1 || match.darts_thrown2) statsLines.push(`🎯 Lotki: ${match.darts_thrown1 ?? 0} / ${match.darts_thrown2 ?? 0}`);

  const embed = {
    title: `🏆 Wynik meczu — ${leagueName}`,
    description: isWalkover
      ? `**${p1Name}** ${match.score1 ?? 0} : ${match.score2 ?? 0} **${p2Name}**\n\n⚠️ **Walkower** — wygrywa ${winner}`
      : `**${p1Name}** ${match.score1 ?? 0} : ${match.score2 ?? 0} **${p2Name}**`,
    color: isWalkover ? 0xED4245 : 0x57F287,
    fields: statsLines.length > 0 ? [{ name: "Statystyki", value: statsLines.join("\n"), inline: false }] : [],
    timestamp: new Date().toISOString(),
    footer: { text: `eDART Polska${league?.format ? ` • ${league.format}` : ""}` },
  };

  const results = await Promise.allSettled(
    webhooks.map(async (wh) => {
      const res = await fetch(wh.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Webhook ${wh.id} error:`, errText);
        return { id: wh.id, success: false, error: errText };
      }
      return { id: wh.id, success: true };
    })
  );

  return jsonResponse({ success: true, results });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

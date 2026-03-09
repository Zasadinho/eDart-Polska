// Background service worker
const EDART_URL = "https://ace-darts-arena.lovable.app";
const SUPABASE_URL = "https://uiolhzctnbskdjteufkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpb2xoemN0bmJza2RqdGV1ZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc4NjEsImV4cCI6MjA4ODQ5Mzg2MX0.SEGOONfttWCS7jbacT5NxlbiOGSxmrVRp4DFqQRDYkk";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTODARTS_TOKEN') {
    chrome.storage.local.get(['autodarts_token', 'token_timestamp'], (result) => {
      sendResponse({
        token: result.autodarts_token || null,
        timestamp: result.token_timestamp || null,
        fresh: result.token_timestamp ? (Date.now() - result.token_timestamp < 300000) : false
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(['autodarts_token', 'token_timestamp']);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'AUTO_SUBMIT_LEAGUE_MATCH') {
    autoSubmitLeagueMatch(message.payload)
      .then((result) => {
        sendResponse(result);
        handleAutoSubmitResult(result, message.payload);
      })
      .catch((err) => {
        console.error("[eDART] Auto-submit failed:", err);
        sendResponse({ is_league_match: false, submitted: false, error: String(err) });
      });
    return true;
  }

  // ─── Live match updates ───
  if (message.type === 'LIVE_MATCH_UPDATE') {
    handleLiveMatchUpdate(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("[eDART] Live match update failed:", err);
        sendResponse({ ok: false });
      });
    return true;
  }

  if (message.type === 'LIVE_MATCH_ENDED') {
    handleLiveMatchEnded(message.matchId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // ─── Autodarts User ID auto-fill ───
  if (message.type === 'AUTODARTS_USER_ID_DETECTED') {
    saveAutodartsUserId(message.userId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

// ─── Live match: upsert to live_matches table ───
async function handleLiveMatchUpdate(payload) {
  try {
    // First check if this is a league match
    const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        player1_autodarts_id: payload.player1_autodarts_id,
        player2_autodarts_id: payload.player2_autodarts_id,
        player1_name: payload.player1_name,
        player2_name: payload.player2_name,
      }),
    });

    if (!checkRes.ok) return;
    const checkData = await checkRes.json();
    if (!checkData.is_league_match) return;

    // It's a league match - send live update
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["autodarts_token"], resolve);
    });

    await fetch(`${SUPABASE_URL}/rest/v1/live_matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        autodarts_match_id: payload.autodarts_match_id,
        autodarts_link: payload.autodarts_link,
        match_id: checkData.match_id || null,
        player1_score: payload.player1_score || 0,
        player2_score: payload.player2_score || 0,
        updated_at: new Date().toISOString(),
      }),
    });

    console.log("[eDART] Live match updated:", payload.autodarts_match_id);
  } catch (err) {
    console.error("[eDART] Live match update error:", err);
  }
}

async function handleLiveMatchEnded(autodartsMatchId) {
  try {
    // Delete from live_matches using service role via edge function
    await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "end_live_match",
        autodarts_match_id: autodartsMatchId,
      }),
    });
    console.log("[eDART] Live match ended:", autodartsMatchId);
  } catch (err) {
    console.error("[eDART] Live match end error:", err);
  }
}

// ─── Save Autodarts User ID to player profile ───
async function saveAutodartsUserId(autodartsUserId) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["edart_user_id", "autodarts_id_saved"], resolve);
    });

    // Skip if already saved for this user
    if (stored.autodarts_id_saved === autodartsUserId) return;

    const edartUserId = stored.edart_user_id;
    if (!edartUserId) {
      console.log("[eDART] No eDART user ID stored, skipping autodarts ID save");
      return;
    }

    // Update player's autodarts_user_id via REST API
    await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${edartUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ autodarts_user_id: autodartsUserId }),
    });

    chrome.storage.local.set({ autodarts_id_saved: autodartsUserId });
    console.log("[eDART] ✅ Autodarts User ID saved to eDART:", autodartsUserId);

    chrome.notifications.create(`autodarts-id-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Autodarts ID zapisane!",
      message: `Twój Autodarts User ID został automatycznie powiązany z kontem eDART.`,
      priority: 1,
    });
  } catch (err) {
    console.error("[eDART] Save autodarts ID error:", err);
  }
}

async function autoSubmitLeagueMatch(matchPayload) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["autodarts_token"], resolve);
    });
    const playerToken = stored.autodarts_token || null;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-submit-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        autodarts_match_id: matchPayload.match_id,
        autodarts_token: playerToken,
        player1_name: matchPayload.player1_name,
        player2_name: matchPayload.player2_name,
        player1_autodarts_id: matchPayload.player1_autodarts_id || null,
        player2_autodarts_id: matchPayload.player2_autodarts_id || null,
      }),
    });

    if (!response.ok) {
      console.error("[eDART] auto-submit HTTP error:", response.status);
      return { is_league_match: false, submitted: false };
    }

    return await response.json();
  } catch (err) {
    console.error("[eDART] auto-submit fetch error:", err);
    return { is_league_match: false, submitted: false };
  }
}

function handleAutoSubmitResult(result, matchPayload) {
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.already_submitted) {
    const statusText = result.status_text || "Wynik wysłany — oczekuje na zatwierdzenie admina.";
    chrome.notifications.create(`league-already-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score || "?"})\n${result.league_name || "Liga"}\n${statusText}`,
      priority: 2,
      requireInteraction: true,
    });
    return;
  }

  if (result.is_league_match && result.submitted) {
    const statusText = result.status === "completed"
      ? "Wynik zatwierdzony automatycznie!"
      : "Wynik wysłany — oczekuje na zatwierdzenie admina.";

    chrome.notifications.create(`league-submitted-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score})\n${result.league_name}\n${statusText}`,
      priority: 2,
      requireInteraction: true,
    });

    chrome.storage.local.set({
      autodarts_league_match: {
        ...matchPayload,
        edart_match_id: result.match_id,
        league_name: result.league_name,
        auto_submitted: true,
        status: result.status,
      },
      autodarts_league_match_timestamp: Date.now(),
    });

  } else if (result.is_league_match && !result.submitted) {
    chrome.notifications.create(`league-detected-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy wykryty",
      message: `${p1} vs ${p2}\n${result.league_name || "Liga"}\n${result.reason || "Wynik nie został wysłany automatycznie."}`,
      priority: 1,
    });
  }
}

// Handle notification click — open eDART
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("league-")) {
    chrome.storage.local.get(["autodarts_league_match"], (result) => {
      const data = result.autodarts_league_match;
      if (data?.edart_match_id) {
        chrome.tabs.create({
          url: `${EDART_URL}/submit-match?match_id=${data.edart_match_id}`,
          active: true,
        });
      } else {
        chrome.tabs.create({ url: `${EDART_URL}/matches`, active: true });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});

// Listen for web requests to autodarts API to capture tokens
chrome.webRequest?.onBeforeSendHeaders?.addListener(
  (details) => {
    const authHeader = details.requestHeaders?.find(h => h.name.toLowerCase() === 'authorization');
    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value.replace('Bearer ', '');
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
  },
  { urls: ["https://api.autodarts.io/*"] },
  ["requestHeaders"]
);

// Content script - runs on play.autodarts.io
// Strategy:
// 1. Intercept Autodarts app's own fetch calls to capture match data + token
// 2. When players are detected, check by NAMES if it's a league match on eDART
// 3. When user is redirected to /history/matches/ (match ended), auto-submit result

(function () {
  console.log("[eDART] Content script loaded on:", location.href);

  function safeJsonParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function normalizeScoreValue(scoreLike) {
    if (typeof scoreLike === "number") return scoreLike;
    if (scoreLike && typeof scoreLike === "object") {
      if (typeof scoreLike.legs === "number") return scoreLike.legs;
      if (typeof scoreLike.sets === "number") return scoreLike.sets;
      if (typeof scoreLike.value === "number") return scoreLike.value;
    }
    return 0;
  }

  function readAvg(stats) {
    if (!stats || typeof stats !== "object") return null;
    if (typeof stats.average === "number") return stats.average;
    if (typeof stats.avg === "number") return stats.avg;
    if (typeof stats.ppd === "number") return Math.round(stats.ppd * 3 * 100) / 100;
    return null;
  }

  function buildPayloadFromMatch(match, fallbackMatchId) {
    const players = Array.isArray(match?.players) ? match.players : [];
    if (players.length < 2) return null;

    const p1 = players[0] || {};
    const p2 = players[1] || {};
    const s1 = p1.stats || {};
    const s2 = p2.stats || {};

    return {
      match_id: match?.id || fallbackMatchId,
      autodarts_link: `https://play.autodarts.io/history/matches/${match?.id || fallbackMatchId}`,
      player1_name: p1.name || p1.username || p1.displayName || "Player 1",
      player2_name: p2.name || p2.username || p2.displayName || "Player 2",
      player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
      player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
      score1: normalizeScoreValue(match?.scores?.[0]),
      score2: normalizeScoreValue(match?.scores?.[1]),
      avg1: readAvg(s1),
      avg2: readAvg(s2),
      first_9_avg1: s1.first9Average ?? s1.firstNineAvg ?? s1.first9Avg ?? null,
      first_9_avg2: s2.first9Average ?? s2.firstNineAvg ?? s2.first9Avg ?? null,
      one_eighties1: s1.oneEighties ?? s1["180s"] ?? 0,
      one_eighties2: s2.oneEighties ?? s2["180s"] ?? 0,
      high_checkout1: s1.highestCheckout ?? s1.bestCheckout ?? 0,
      high_checkout2: s2.highestCheckout ?? s2.bestCheckout ?? 0,
      ton60_1: s1.ton60 ?? s1["60+"] ?? 0,
      ton60_2: s2.ton60 ?? s2["60+"] ?? 0,
      ton80_1: s1.ton80 ?? s1["80+"] ?? 0,
      ton80_2: s2.ton80 ?? s2["80+"] ?? 0,
      ton_plus1: s1.tonPlus ?? s1["100+"] ?? 0,
      ton_plus2: s2.tonPlus ?? s2["100+"] ?? 0,
      darts_thrown1: s1.dartsThrown ?? s1.darts ?? 0,
      darts_thrown2: s2.dartsThrown ?? s2.darts ?? 0,
      checkout_attempts1: s1.checkoutAttempts ?? s1.checkoutDarts ?? 0,
      checkout_attempts2: s2.checkoutAttempts ?? s2.checkoutDarts ?? 0,
      checkout_hits1: s1.checkoutHits ?? s1.checkouts ?? 0,
      checkout_hits2: s2.checkoutHits ?? s2.checkouts ?? 0,
      captured_at: Date.now(),
    };
  }

  function isFinishedMatch(match) {
    const state = String(match?.state || "").toLowerCase();
    if (["finished", "complete", "completed", "done", "ended"].includes(state)) return true;
    if (typeof match?.winner === "number") return true;
    return false;
  }

  // ─── State ───
  const processedMatches = new Set();
  const checkedLeagueMatches = new Set();
  let lastInterceptedMatch = null; // last match data from intercepted fetch

  // ─── League check by player names ───
  function checkLeagueByNames(match) {
    const players = Array.isArray(match?.players) ? match.players : [];
    if (players.length < 2) return;

    const p1 = players[0] || {};
    const p2 = players[1] || {};
    const p1Name = p1.name || p1.username || p1.displayName || "";
    const p2Name = p2.name || p2.username || p2.displayName || "";
    const matchId = match?.id || "unknown";

    if (!p1Name || !p2Name) return;

    const key = [p1Name, p2Name].sort().join("|");
    if (checkedLeagueMatches.has(key)) return;
    checkedLeagueMatches.add(key);

    console.log("[eDART] 🔍 Sprawdzam czy mecz ligowy:", p1Name, "vs", p2Name);

    chrome.runtime.sendMessage(
      {
        type: "CHECK_LEAGUE_MATCH_LIVE",
        payload: {
          autodarts_match_id: matchId,
          player1_name: p1Name,
          player2_name: p2Name,
          player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
          player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[eDART] CHECK error:", chrome.runtime.lastError.message);
          return;
        }
        if (response?.is_league_match) {
          console.log("[eDART] 🎯 Mecz ligowy wykryty!", response.league_name);
        } else {
          console.log("[eDART] ℹ️ Mecz towarzyski (nie ligowy)");
        }
      }
    );
  }

  // ─── Auto-submit finished match ───
  function submitFinishedMatch(match, sourceUrl) {
    if (!match || !isFinishedMatch(match)) return;

    const idFromUrl = sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1] || null;
    const payload = buildPayloadFromMatch(match, idFromUrl);
    if (!payload?.match_id) return;
    if (processedMatches.has(payload.match_id)) return;
    processedMatches.add(payload.match_id);

    console.log("[eDART] 🏁 Mecz zakończony:", payload.player1_name, "vs", payload.player2_name,
      "Wynik:", payload.score1, "-", payload.score2);

    // Store for manual use
    chrome.storage.local.set({
      autodarts_last_match: payload,
      autodarts_last_match_timestamp: Date.now(),
    });

    // Auto-submit
    console.log("[eDART] 📤 Wysyłam wynik do eDART...");
    chrome.runtime.sendMessage(
      { type: "AUTO_SUBMIT_LEAGUE_MATCH", payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[eDART] sendMessage error:", chrome.runtime.lastError.message);
          return;
        }
        if (response?.is_league_match && response?.submitted) {
          console.log("[eDART] ✅ Mecz ligowy zgłoszony automatycznie!", response.league_name, response.score);
        } else if (response?.is_league_match) {
          console.log("[eDART] ⚠️ Mecz ligowy wykryty, ale nie zgłoszony:", response.reason);
        } else {
          console.log("[eDART] ℹ️ Mecz towarzyski — wynik nie wysłany");
        }
      }
    );
  }

  // ─── Intercept fetch — capture match data from Autodarts app ───
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const options = args[1] || {};
    const url = typeof request === "string" ? request : request?.url;

    // Capture auth token from any Autodarts API call
    if (url && url.includes("api.autodarts.io")) {
      let authHeader = null;
      if (options.headers) {
        if (options.headers instanceof Headers) {
          authHeader = options.headers.get("Authorization");
        } else if (typeof options.headers === "object") {
          authHeader = options.headers.Authorization || options.headers.authorization;
        }
      }
      if (!authHeader && request instanceof Request) {
        authHeader = request.headers?.get("Authorization");
      }
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
      }
    }

    const fetchPromise = originalFetch.apply(this, args);

    // Intercept match data responses
    if (url && /api\.autodarts\.io\/.+\/matches\/[a-f0-9-]+/i.test(url)) {
      fetchPromise
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.clone().json().catch(() => null);
          if (!data) return;

          const state = String(data?.state || "").toLowerCase();
          const players = Array.isArray(data?.players) ? data.players : [];
          console.log("[eDART] 🔎 Przechwycono dane meczu — stan:", state, "gracze:", 
            players.map(p => p.name || p.username || "?").join(" vs "));

          lastInterceptedMatch = data;

          // If match has players, check league
          if (players.length >= 2) {
            checkLeagueByNames(data);
          }

          // If match is finished (intercepted), submit immediately
          if (isFinishedMatch(data)) {
            submitFinishedMatch(data, url);
          }
        })
        .catch(() => {});
    }

    // Also intercept lobby responses for player detection
    if (url && /api\.autodarts\.io\/.+\/lobbies\/[a-f0-9-]+/i.test(url)) {
      fetchPromise
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.clone().json().catch(() => null);
          if (!data) return;
          const players = Array.isArray(data?.players) ? data.players : [];
          if (players.length >= 2) {
            console.log("[eDART] 🔎 Przechwycono lobby — gracze:", 
              players.map(p => p.name || p.username || "?").join(" vs "));
            checkLeagueByNames(data);
          }
        })
        .catch(() => {});
    }

    return fetchPromise;
  };

  // ─── Intercept XMLHttpRequest for token capture ───
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._url && this._url.includes("api.autodarts.io") && name.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
      const token = value.replace("Bearer ", "");
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  // ─── Detect history page navigation (match ended → Autodarts redirects here) ───
  let lastUrl = location.href;

  function checkForHistoryPage() {
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;

    const historyMatch = url.match(/\/history\/matches\/([a-f0-9-]+)/i);
    if (historyMatch) {
      const matchId = historyMatch[1];
      console.log("[eDART] 📍 Wykryto stronę historii meczu:", matchId);

      // If we have intercepted match data, submit it
      if (lastInterceptedMatch && isFinishedMatch(lastInterceptedMatch)) {
        console.log("[eDART] ✅ Mam dane z przechwycenia — wysyłam wynik");
        submitFinishedMatch(lastInterceptedMatch, url);
      } else {
        // Wait a moment for Autodarts to load match data (will be intercepted)
        console.log("[eDART] ⏳ Czekam na dane meczu z historii...");
        setTimeout(() => {
          if (lastInterceptedMatch && isFinishedMatch(lastInterceptedMatch)) {
            submitFinishedMatch(lastInterceptedMatch, url);
          }
        }, 3000);
      }
    }
  }

  // Monitor URL changes
  setInterval(checkForHistoryPage, 1000);

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(checkForHistoryPage, 500);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(checkForHistoryPage, 500);
  };
  window.addEventListener("popstate", () => setTimeout(checkForHistoryPage, 500));

  // ─── Auto-detect Autodarts User ID ───
  function detectAutodartsUserId() {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (!value) continue;
        const parsed = safeJsonParse(value);
        if (parsed?.profile?.sub) return parsed.profile.sub;
      }
    }
    return null;
  }

  function getAutodartsToken() {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (!value) continue;
        const parsed = safeJsonParse(value);
        if (parsed?.access_token) return parsed.access_token;
      }
    }
    return null;
  }

  // ─── Initial setup ───
  const token = getAutodartsToken();
  if (token) {
    chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    console.log("[eDART] ✅ Token Autodarts przechwycony");
  } else {
    console.log("[eDART] ⚠️ Brak tokena Autodarts");
  }

  const userId = detectAutodartsUserId();
  if (userId) {
    chrome.storage.local.set({ autodarts_user_id: userId });
    chrome.runtime.sendMessage({ type: "AUTODARTS_USER_ID_DETECTED", userId });
    console.log("[eDART] ✅ Autodarts User ID:", userId);
  }

  // Periodic token refresh
  setInterval(() => {
    const t = getAutodartsToken();
    if (t) chrome.storage.local.set({ autodarts_token: t, token_timestamp: Date.now() });
    const uid = detectAutodartsUserId();
    if (uid) chrome.storage.local.set({ autodarts_user_id: uid });
  }, 10000);

  // If already on history page, check
  if (location.href.includes("/history/matches/")) {
    console.log("[eDART] 📍 Załadowano na stronie historii meczu");
    // Data will come from intercepted fetch
  }
})();

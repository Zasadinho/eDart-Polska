// ─── Popup dashboard logic ───
const bAPI = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const copyBtn = document.getElementById("copyBtn");
  const openBtn = document.getElementById("openAutodarts");
  const settingsBtn = document.getElementById("openSettings");
  const historyContainer = document.getElementById("matchHistory");
  const autodartsIdEl = document.getElementById("autodartsId");
  const statsSection = document.getElementById("statsSection");

  // ─── Settings button ───
  settingsBtn.addEventListener("click", () => {
    bAPI.runtime.openOptionsPage
      ? bAPI.runtime.openOptionsPage()
      : bAPI.tabs.create({ url: bAPI.runtime.getURL("options.html") });
  });

  // ─── Token status ───
  bAPI.storage.local.get(
    ["autodarts_token", "token_timestamp", "autodarts_user_id"],
    (result) => {
      if (result.autodarts_token) {
        const age = Date.now() - (result.token_timestamp || 0);
        const fresh = age < 300000;
        const mins = Math.floor(age / 60000);

        statusEl.className = "status connected";
        statusEl.innerHTML = `<span class="icon">✅</span> Token ${fresh ? "aktywny" : "może być nieaktualny"}`;

        copyBtn.style.display = "block";
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(result.autodarts_token).then(() => {
            copyBtn.textContent = "✅ Skopiowano!";
            setTimeout(() => (copyBtn.textContent = "📋 Kopiuj token"), 2000);
          });
        };
      } else {
        statusEl.className = "status disconnected";
        statusEl.innerHTML = '<span class="icon">❌</span> Brak tokena — zaloguj się do Autodarts';
      }

      if (result.autodarts_user_id) {
        autodartsIdEl.style.display = "block";
        autodartsIdEl.textContent = `Autodarts ID: ${result.autodarts_user_id.substring(0, 12)}...`;
      }
    }
  );

  // ─── Match history ───
  bAPI.storage.local.get(["match_history"], (result) => {
    const history = (result.match_history || []).slice(0, 5);
    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="empty">Brak ostatnich meczów ligowych</div>';
      return;
    }

    // Stats summary
    statsSection.style.display = "block";
    document.getElementById("totalMatches").textContent = history.length;
    const wins = history.filter((m) => m.submitted && !m.alreadySubmitted).length;
    document.getElementById("winRate").textContent = history.length > 0 ? `${Math.round((wins / history.length) * 100)}%` : "-";

    historyContainer.innerHTML = history
      .map((m) => {
        const date = new Date(m.timestamp);
        const timeStr = `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
        const statusClass =
          m.status === "submitted" ? "status-submitted"
          : m.status === "already_submitted" ? "status-already"
          : "status-failed";
        const statusLabel =
          m.status === "submitted" ? "Wysłany"
          : m.status === "already_submitted" ? "Już zgłoszony"
          : "Błąd";

        return `
          <div class="match-card">
            <div class="players">${m.player1} vs ${m.player2} — <strong>${m.score || "?"}</strong></div>
            <div class="meta">
              <span>${m.league || "Liga"} · ${timeStr}</span>
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>
          </div>
        `;
      })
      .join("");
  });

  // ─── Buttons ───
  openBtn.onclick = () => bAPI.tabs.create({ url: "https://play.autodarts.io" });
});

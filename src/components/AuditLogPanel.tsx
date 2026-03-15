import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Clock, Shield, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchAuditEntry {
  id: string;
  match_id: string;
  user_id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_name?: string;
}

interface AdminAuditEntry {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
  user_name?: string;
}

type AuditTab = "admin" | "matches";

const AuditLogPanel = () => {
  const [matchLogs, setMatchLogs] = useState<MatchAuditEntry[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AuditTab>("admin");

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch match audit log
      const { data: matchData } = await supabase
        .from("match_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // Fetch admin audit log
      const { data: adminData } = await supabase
        .from("admin_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const allUserIds = new Set<string>();
      (matchData || []).forEach((d: any) => allUserIds.add(d.user_id));
      (adminData || []).forEach((d: any) => { if (d.user_id) allUserIds.add(d.user_id); });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", [...allUserIds]);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => (nameMap[p.user_id] = p.name));

      setMatchLogs(
        (matchData || []).map((d: any) => ({
          ...d,
          user_name: nameMap[d.user_id] || d.user_id?.slice(0, 8),
        }))
      );

      setAdminLogs(
        (adminData || []).map((d: any) => ({
          ...d,
          user_name: d.user_id ? (nameMap[d.user_id] || d.user_id.slice(0, 8)) : "System",
        }))
      );

      setLoading(false);
    };
    fetchAll();
  }, []);

  const matchActionLabel = (action: string) => {
    switch (action) {
      case "approve": return "✅ Zatwierdzono";
      case "reject": return "❌ Odrzucono";
      case "edit": return "✏️ Edytowano";
      case "submit": return "📤 Zgłoszono";
      case "auto_submit": return "🤖 Auto-zgłoszenie";
      default: return action;
    }
  };

  const adminActionLabel = (action: string) => {
    const map: Record<string, string> = {
      delete_match: "🗑️ Usunięto mecz",
      update_match: "✏️ Edytowano mecz",
      approve_match: "✅ Zatwierdzono mecz",
      reject_match: "❌ Odrzucono mecz",
      create_league: "🏆 Utworzono ligę",
      update_league: "✏️ Edytowano ligę",
      delete_league: "🗑️ Usunięto ligę",
      archive_league: "📦 Zarchiwizowano ligę",
      create_player: "👤 Dodano gracza",
      update_player: "✏️ Edytowano gracza",
      delete_player: "🗑️ Usunięto gracza",
      approve_player: "✅ Zatwierdzono gracza",
      assign_role: "🔑 Przyznano rolę",
      remove_role: "🔓 Usunięto rolę",
      ban_player: "🚫 Zbanowano gracza",
      unban_player: "✅ Odbanowano gracza",
      create_challenge: "🏅 Utworzono wyzwanie",
      update_challenge: "✏️ Edytowano wyzwanie",
      delete_challenge: "🗑️ Usunięto wyzwanie",
      update_extension_settings: "⚙️ Zmieniono ustawienia wtyczki",
      update_auto_approve: "⚡ Zmieniono auto-zatwierdzanie",
    };
    return map[action] || action;
  };

  const targetTypeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      match: "Mecz",
      league: "Liga",
      player: "Gracz",
      challenge: "Wyzwanie",
      role: "Rola",
      ban: "Ban",
      settings: "Ustawienia",
    };
    return type ? (map[type] || type) : "";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" /> Dziennik zmian
      </h2>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "admin" ? "default" : "outline"} size="sm" onClick={() => setTab("admin")} className="font-display uppercase tracking-wider text-xs">
          <Shield className="h-3.5 w-3.5 mr-1" /> Akcje admina ({adminLogs.length})
        </Button>
        <Button variant={tab === "matches" ? "default" : "outline"} size="sm" onClick={() => setTab("matches")} className="font-display uppercase tracking-wider text-xs">
          <Swords className="h-3.5 w-3.5 mr-1" /> Mecze ({matchLogs.length})
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground font-body text-sm">Ładowanie...</p>
      ) : tab === "admin" ? (
        adminLogs.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm">Brak wpisów w dzienniku admina.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {adminLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border bg-card p-4 card-glow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-sm font-bold text-foreground">
                    {adminActionLabel(log.action)}
                  </span>
                  <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(log.created_at).toLocaleString("pl-PL")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-body">
                  <span className="text-foreground font-medium">{log.user_name}</span>
                  {log.target_type && (
                    <> · {targetTypeLabel(log.target_type)}{log.target_id && <span className="text-primary ml-1">{log.target_id.slice(0, 8)}…</span>}</>
                  )}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground font-mono bg-muted/30 rounded p-2 overflow-x-auto">
                    {Object.entries(log.details)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                      .join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : matchLogs.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Brak wpisów w dzienniku meczów.</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {matchLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border bg-card p-4 card-glow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm font-bold text-foreground">
                  {matchActionLabel(log.action)}
                </span>
                <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-body">
                <span className="text-foreground font-medium">{log.user_name}</span>
                {" · Mecz: "}
                <span className="text-primary">{log.match_id?.slice(0, 8)}…</span>
              </div>
              {log.new_data && (
                <div className="mt-2 text-[11px] text-muted-foreground font-mono bg-muted/30 rounded p-2 overflow-x-auto">
                  {typeof log.new_data === "object"
                    ? Object.entries(log.new_data)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")
                    : String(log.new_data)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;

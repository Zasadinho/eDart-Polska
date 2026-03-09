import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Clock } from "lucide-react";

interface AuditEntry {
  id: string;
  match_id: string;
  user_id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_name?: string;
}

const AuditLogPanel = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("match_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data) {
        setLoading(false);
        return;
      }

      // Get user names
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => (nameMap[p.user_id] = p.name));

      setLogs(
        data.map((d) => ({
          ...d,
          user_name: nameMap[d.user_id] || d.user_id.slice(0, 8),
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const actionLabel = (action: string) => {
    switch (action) {
      case "approve": return "✅ Zatwierdzono";
      case "reject": return "❌ Odrzucono";
      case "edit": return "✏️ Edytowano";
      case "submit": return "📤 Zgłoszono";
      case "auto_submit": return "🤖 Auto-zgłoszenie";
      default: return action;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" /> Dziennik zmian
      </h2>

      {loading ? (
        <p className="text-muted-foreground font-body text-sm">Ładowanie...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Brak wpisów w dzienniku.</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-border bg-card p-4 card-glow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm font-bold text-foreground">
                  {actionLabel(log.action)}
                </span>
                <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-body">
                <span className="text-foreground font-medium">{log.user_name}</span>
                {" · Mecz: "}
                <span className="text-primary">{log.match_id.slice(0, 8)}…</span>
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bug, Trash2, CheckCircle2, Clock } from "lucide-react";

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

const BugReportsPanel = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bug_reports" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as any as BugReport[]) || []);
    setLoading(false);
  };

  const markResolved = async (id: string) => {
    await supabase.from("bug_reports" as any).update({ status: "resolved" }).eq("id", id);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
    toast({ title: "Oznaczono jako rozwiązane ✅" });
  };

  const deleteReport = async (id: string) => {
    await supabase.from("bug_reports" as any).delete().eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Zgłoszenie usunięte" });
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>;

  const openReports = reports.filter((r) => r.status === "open");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Bug className="h-5 w-5 text-destructive" />
        <h2 className="text-xl font-display font-bold text-foreground">
          Zgłoszenia błędów ({openReports.length} otwartych)
        </h2>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">Brak zgłoszeń</h3>
          <p className="text-muted-foreground font-body">Nie ma żadnych zgłoszonych błędów.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...openReports, ...resolvedReports].map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border bg-card p-4 ${
                r.status === "open" ? "border-destructive/30" : "border-border opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {r.status === "open" ? (
                      <Clock className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                    )}
                    <span className="font-body font-semibold text-foreground text-sm">{r.title}</span>
                    <span className={`text-[10px] font-display uppercase px-2 py-0.5 rounded-full border ${
                      r.status === "open"
                        ? "border-destructive/30 text-destructive bg-destructive/10"
                        : "border-secondary/30 text-secondary bg-secondary/10"
                    }`}>
                      {r.status === "open" ? "Otwarte" : "Rozwiązane"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body whitespace-pre-wrap">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(r.created_at).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.status === "open" && (
                    <Button variant="ghost" size="sm" onClick={() => markResolved(r.id)} className="h-7 px-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Rozwiązane
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteReport(r.id)} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BugReportsPanel;

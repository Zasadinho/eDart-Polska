import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ExportPanel = () => {
  const { leagues, matches, players, getLeagueStandings } = useLeague();
  const { toast } = useToast();
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id || "");

  const exportCSV = (type: "standings" | "matches") => {
    if (!selectedLeague) return;
    const league = leagues.find((l) => l.id === selectedLeague);
    if (!league) return;

    let csv = "";
    if (type === "standings") {
      const standings = getLeagueStandings(selectedLeague);
      csv = "Pozycja,Gracz,Mecze,Wygrane,Przegrane,Punkty,Średnia,180s,HC,Win%\n";
      standings.forEach((s, i) => {
        csv += `${i + 1},"${s.name}",${s.stats.matchesPlayed},${s.stats.wins},${s.stats.losses},${s.stats.points},${s.stats.avg},${s.stats.oneEighties},${s.stats.highestCheckout},${s.stats.winRate}%\n`;
      });
    } else {
      const leagueMatches = matches
        .filter((m) => m.leagueId === selectedLeague && m.status === "completed")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      csv = "Data,Kolejka,Gracz1,Gracz2,Wynik,Śr.1,Śr.2,180s_1,180s_2,HC1,HC2\n";
      leagueMatches.forEach((m) => {
        csv += `${m.date},${m.round || ""},"${m.player1Name}","${m.player2Name}",${m.score1}-${m.score2},${m.avg1 || ""},${m.avg2 || ""},${m.oneEighties1 || 0},${m.oneEighties2 || 0},${m.highCheckout1 || 0},${m.highCheckout2 || 0}\n`;
      });
    }

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${league.name}_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "📥 Eksport gotowy!", description: `Plik CSV został pobrany.` });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" /> Eksport danych
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2 block">
            Wybierz ligę
          </label>
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger className="bg-muted/30 border-border">
              <SelectValue placeholder="Wybierz ligę" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} ({l.season})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => exportCSV("standings")}
            disabled={!selectedLeague}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Eksport tabeli (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => exportCSV("matches")}
            disabled={!selectedLeague}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Eksport meczów (CSV)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;

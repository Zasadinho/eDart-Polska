import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Check, ExternalLink, TestTube } from "lucide-react";

const DiscordWebhookPanel = ({ leagues }: { leagues: any[] }) => {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("extension_settings")
      .select("id, webhook_enabled")
      .is("league_id", null)
      .maybeSingle();
    
    if (data) {
      setEnabled(data.webhook_enabled ?? false);
    }

    // Load webhook URL from edge function config (stored as secret)
    // We'll check if the function exists
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save webhook URL via edge function that stores it
      const { data, error } = await supabase.functions.invoke("discord-webhook", {
        body: { action: "save_config", webhook_url: webhookUrl, enabled },
      });
      
      if (error) throw error;
      toast({ title: "✅ Zapisano!", description: "Konfiguracja Discord została zaktualizowana." });
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message || "Nie udało się zapisać konfiguracji.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("discord-webhook", {
        body: { action: "test" },
      });
      
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Wysłano!", description: "Wiadomość testowa została wysłana na Discord." });
      } else {
        toast({ title: "Błąd", description: data?.error || "Nie udało się wysłać wiadomości testowej.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message || "Nie udało się wysłać wiadomości testowej.", variant: "destructive" });
    }
    setTesting(false);
  };

  if (loading) return <p className="text-muted-foreground font-body text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#5865F2]" /> Integracja z Discord
        </h3>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Automatycznie wysyłaj wyniki meczów na kanał Discord po ich zatwierdzeniu. 
          Wiadomość zawiera nazwy graczy, wynik, ligę oraz kluczowe statystyki.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Włącz wysyłanie na Discord</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Po zatwierdzeniu meczu wynik zostanie automatycznie wysłany</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Webhook URL</Label>
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="bg-muted/30 border-border font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground font-body">
              Skopiuj URL webhooka z ustawień kanału Discord: Edytuj kanał → Integracje → Webhooki → Nowy webhook
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="hero" onClick={handleSave} disabled={saving || !webhookUrl.trim()}>
              <Check className="h-4 w-4 mr-1" /> {saving ? "Zapisywanie..." : "Zapisz konfigurację"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !webhookUrl.trim()}>
              <TestTube className="h-4 w-4 mr-1" /> {testing ? "Wysyłanie..." : "Wyślij test"}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <h4 className="font-display font-bold text-foreground mb-3 text-sm">Przykładowa wiadomość na Discord</h4>
        <div className="rounded-lg bg-[#36393f] p-4 text-sm space-y-1">
          <div className="text-[#b9bbbe] text-xs mb-2">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
          <div className="border-l-4 border-[#5865F2] pl-3 space-y-1">
            <div className="text-white font-bold">🏆 Wynik meczu — Liga Sezon 1</div>
            <div className="text-[#dcddde]">
              <span className="text-[#00b0f4] font-semibold">Jan Kowalski</span> <span className="text-white font-bold text-lg">3</span> : <span className="text-white font-bold text-lg">1</span> <span className="text-[#00b0f4] font-semibold">Adam Nowak</span>
            </div>
            <div className="text-[#b9bbbe] text-xs space-y-0.5">
              <div>📊 Średnia: 65.2 / 58.1</div>
              <div>🎯 180s: 2 / 0</div>
              <div>✅ High CO: 110 / 80</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordWebhookPanel;

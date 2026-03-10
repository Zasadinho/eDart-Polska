import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Hook that listens for browser extension messages about league match events
 * and shows toast notifications to the user.
 */
export function useExtensionNotifications() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      // League match auto-submitted successfully
      if (event.data?.type === "EDART_LEAGUE_MATCH_PUSH" && event.data?.payload) {
        const data = event.data.payload;

        if (data.auto_submitted && data.status === "completed") {
          toast.success("🎯 Mecz ligowy zatwierdzony!", {
            description: `${data.player1_name} vs ${data.player2_name} — ${data.league_name}`,
            duration: 10000,
            action: data.edart_match_id
              ? {
                  label: "Zobacz",
                  onClick: () => navigate(`/submit?match_id=${data.edart_match_id}`),
                }
              : undefined,
          });
        } else if (data.auto_submitted && data.status === "pending_approval") {
          toast.success("🎯 Mecz ligowy wysłany!", {
            description: `${data.player1_name} vs ${data.player2_name} — ${data.league_name}\nOczekuje na zatwierdzenie admina.`,
            duration: 10000,
            action: data.edart_match_id
              ? {
                  label: "Zobacz",
                  onClick: () => navigate(`/submit?match_id=${data.edart_match_id}`),
                }
              : undefined,
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);
}

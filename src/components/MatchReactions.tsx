import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const EMOJIS = ["🎯", "🔥", "👏", "💪", "😮"];

interface ReactionCount {
  emoji: string;
  count: number;
  myReaction: boolean;
}

const MatchReactions = ({ matchId }: { matchId: string }) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("match_reactions")
      .select("emoji, user_id")
      .eq("match_id", matchId);

    const counts: Record<string, { count: number; mine: boolean }> = {};
    EMOJIS.forEach((e) => (counts[e] = { count: 0, mine: false }));

    (data || []).forEach((r) => {
      if (!counts[r.emoji]) counts[r.emoji] = { count: 0, mine: false };
      counts[r.emoji].count++;
      if (r.user_id === user?.id) counts[r.emoji].mine = true;
    });

    setReactions(
      EMOJIS.map((e) => ({
        emoji: e,
        count: counts[e]?.count || 0,
        myReaction: counts[e]?.mine || false,
      }))
    );
  };

  useEffect(() => {
    fetchReactions();
  }, [matchId, user?.id]);

  const toggle = async (emoji: string) => {
    if (!user) return;

    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing?.myReaction) {
      await supabase
        .from("match_reactions")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("match_reactions").insert({
        match_id: matchId,
        user_id: user.id,
        emoji,
      });
    }
    fetchReactions();
  };

  return (
    <div className="flex items-center gap-1.5 mt-3">
      {reactions.map((r) => (
        <motion.button
          key={r.emoji}
          whileTap={{ scale: 1.3 }}
          onClick={() => toggle(r.emoji)}
          disabled={!user}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
            r.myReaction
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"
          } ${!user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span>{r.emoji}</span>
          {r.count > 0 && <span className="font-display">{r.count}</span>}
        </motion.button>
      ))}
    </div>
  );
};

export default MatchReactions;

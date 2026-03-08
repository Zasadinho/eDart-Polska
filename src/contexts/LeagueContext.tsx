import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import {
  Player, Match, League, PlayerLeagueStats, Achievement,
  players as initialPlayers,
  matches as initialMatches,
  leagues as initialLeagues,
  achievements,
} from "@/data/mockData";

interface LeagueContextType {
  players: Player[];
  matches: Match[];
  leagues: League[];
  activeLeagueId: string;
  setActiveLeagueId: (id: string) => void;
  getLeagueMatches: (leagueId: string) => Match[];
  getPlayerLeagueStats: (playerId: string, leagueId: string) => PlayerLeagueStats;
  getPlayerAllLeagueStats: (playerId: string) => { league: League; stats: PlayerLeagueStats }[];
  getPlayerAchievements: (playerId: string, leagueId: string) => Achievement[];
  getLeagueStandings: (leagueId: string) => (Player & { stats: PlayerLeagueStats })[];
  submitMatchResult: (matchId: string, data: MatchResultData) => void;
  addMatch: (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => void;
  approvePlayer: (playerId: string) => void;
  pendingPlayers: Player[];
  addPendingPlayer: (name: string) => void;
  // League management
  addLeague: (league: Omit<League, "id">) => void;
  updateLeague: (id: string, data: Partial<League>) => void;
  deleteLeague: (id: string) => void;
  // Player management
  updatePlayer: (id: string, data: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  assignPlayerToLeague: (playerId: string, leagueId: string) => void;
  removePlayerFromLeague: (playerId: string, leagueId: string) => void;
  // Delete match
  deleteMatch: (matchId: string) => void;
  // Global ton stats
  getGlobalTonStats: () => TonLeaderEntry[];
  getLeagueTonStats: (leagueId: string) => TonLeaderEntry[];
}

export interface MatchResultData {
  score1: number;
  score2: number;
  avg1?: number;
  avg2?: number;
  oneEighties1?: number;
  oneEighties2?: number;
  highCheckout1?: number;
  highCheckout2?: number;
  ton40_1?: number;
  ton40_2?: number;
  ton60_1?: number;
  ton60_2?: number;
  ton80_1?: number;
  ton80_2?: number;
  tonPlus1?: number;
  tonPlus2?: number;
  dartsThrown1?: number;
  dartsThrown2?: number;
  autodartsLink?: string;
}

export interface TonLeaderEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  ton40: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
  oneEighties: number;
  totalTons: number;
  highestCheckout: number;
  bestAvg: number;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

const calcStats = (playerId: string, leagueId: string, matches: Match[]): PlayerLeagueStats => {
  const completed = matches.filter(
    (m) => m.leagueId === leagueId && m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId)
  );

  let wins = 0, losses = 0, draws = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
  let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
  let ton40 = 0, ton60 = 0, ton80 = 0, tonPlus = 0;
  const avgValues: number[] = [];
  const form: ("W" | "L" | "D")[] = [];

  completed.forEach((m) => {
    const isP1 = m.player1Id === playerId;
    const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    const myLegs = isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
    const oppLegs = isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);

    legsWon += myLegs;
    legsLost += oppLegs;
    oneEighties += isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
    const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
    if (hc > highestCheckout) highestCheckout = hc;
    const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
    if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
    totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
    ton40 += isP1 ? (m.ton40_1 ?? 0) : (m.ton40_2 ?? 0);
    ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
    ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
    tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);

    if (myScore > oppScore) { wins++; form.push("W"); }
    else if (myScore < oppScore) { losses++; form.push("L"); }
    else { draws++; form.push("D"); }
  });

  const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;

  return {
    playerId, leagueId,
    wins, losses, draws,
    points: wins * 3 + draws,
    legsWon, legsLost, avg,
    highestCheckout, oneEighties,
    form: form.slice(-5),
    badges: [],
    matchesPlayed: completed.length,
    bestAvg: Math.round(bestAvg * 10) / 10,
    totalDartsThrown: totalDarts,
    ton40, ton60, ton80, tonPlus,
  };
};

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const [matchList, setMatchList] = useState<Match[]>(initialMatches);
  const [playerList, setPlayerList] = useState<Player[]>(initialPlayers);
  const [leagueList, setLeagueList] = useState<League[]>(initialLeagues);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState("l1");

  const getLeagueMatches = useCallback((leagueId: string) => matchList.filter((m) => m.leagueId === leagueId), [matchList]);

  const getPlayerLeagueStats = useCallback((playerId: string, leagueId: string) => calcStats(playerId, leagueId, matchList), [matchList]);

  const getPlayerAllLeagueStats = useCallback((playerId: string) => {
    return leagueList.filter(l => {
      return matchList.some(m => m.leagueId === l.id && (m.player1Id === playerId || m.player2Id === playerId));
    }).map(league => ({
      league,
      stats: calcStats(playerId, league.id, matchList),
    }));
  }, [matchList, leagueList]);

  const getPlayerAchievements = useCallback((playerId: string, leagueId: string) => {
    const stats = calcStats(playerId, leagueId, matchList);
    return achievements.filter((a) => a.condition(stats));
  }, [matchList]);

  const getLeagueStandings = useCallback((leagueId: string) => {
    const leaguePlayers = playerList.filter((p) => p.approved && matchList.some(
      (m) => m.leagueId === leagueId && (m.player1Id === p.id || m.player2Id === p.id)
    ));
    return leaguePlayers
      .map((p) => ({ ...p, stats: calcStats(p.id, leagueId, matchList) }))
      .sort((a, b) => b.stats.points - a.stats.points || (b.stats.legsWon - b.stats.legsLost) - (a.stats.legsWon - a.stats.legsLost));
  }, [matchList, playerList]);

  const submitMatchResult = useCallback((matchId: string, data: MatchResultData) => {
    setMatchList((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, ...data, legsWon1: data.score1, legsWon2: data.score2, status: "completed" as const } : m
      )
    );
  }, []);

  const addMatch = useCallback((leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => {
    const p1 = playerList.find((p) => p.id === player1Id);
    const p2 = playerList.find((p) => p.id === player2Id);
    if (!p1 || !p2) return;
    setMatchList((prev) => [...prev, {
      id: `m${Date.now()}`, leagueId, player1Id, player2Id,
      player1Name: p1.name, player2Name: p2.name,
      status: "upcoming", date, round,
    }]);
  }, [playerList]);

  const deleteMatch = useCallback((matchId: string) => {
    setMatchList((prev) => prev.filter((m) => m.id !== matchId));
  }, []);

  const addPendingPlayer = useCallback((name: string) => {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    setPendingPlayers((prev) => [...prev, { id: `p${Date.now()}`, name, avatar: initials, approved: false }]);
  }, []);

  const approvePlayer = useCallback((playerId: string) => {
    setPendingPlayers((prev) => {
      const player = prev.find((p) => p.id === playerId);
      if (player) setPlayerList((bp) => [...bp, { ...player, approved: true, leagueIds: [] }]);
      return prev.filter((p) => p.id !== playerId);
    });
  }, []);

  // League management
  const addLeague = useCallback((league: Omit<League, "id">) => {
    setLeagueList((prev) => [...prev, { ...league, id: `l${Date.now()}` }]);
  }, []);

  const updateLeague = useCallback((id: string, data: Partial<League>) => {
    setLeagueList((prev) => prev.map((l) => l.id === id ? { ...l, ...data } : l));
  }, []);

  const deleteLeague = useCallback((id: string) => {
    setLeagueList((prev) => prev.filter((l) => l.id !== id));
    setMatchList((prev) => prev.filter((m) => m.leagueId !== id));
  }, []);

  const updatePlayer = useCallback((id: string, data: Partial<Player>) => {
    setPlayerList((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setPlayerList((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const assignPlayerToLeague = useCallback((playerId: string, leagueId: string) => {
    setPlayerList((prev) => prev.map((p) => {
      if (p.id === playerId) {
        const ids = p.leagueIds || [];
        if (!ids.includes(leagueId)) return { ...p, leagueIds: [...ids, leagueId] };
      }
      return p;
    }));
  }, []);

  const removePlayerFromLeague = useCallback((playerId: string, leagueId: string) => {
    setPlayerList((prev) => prev.map((p) => {
      if (p.id === playerId) {
        return { ...p, leagueIds: (p.leagueIds || []).filter((id) => id !== leagueId) };
      }
      return p;
    }));
  }, []);

  // Ton stats
  const calcTonStats = useCallback((filterLeagueId?: string): TonLeaderEntry[] => {
    const filtered = filterLeagueId ? matchList.filter(m => m.leagueId === filterLeagueId && m.status === "completed") : matchList.filter(m => m.status === "completed");
    const playerMap = new Map<string, TonLeaderEntry>();

    filtered.forEach((m) => {
      [
        { id: m.player1Id, name: m.player1Name, t40: m.ton40_1 ?? 0, t60: m.ton60_1 ?? 0, t80: m.ton80_1 ?? 0, tp: m.tonPlus1 ?? 0, e: m.oneEighties1 ?? 0, hc: m.highCheckout1 ?? 0, avg: m.avg1 ?? 0 },
        { id: m.player2Id, name: m.player2Name, t40: m.ton40_2 ?? 0, t60: m.ton60_2 ?? 0, t80: m.ton80_2 ?? 0, tp: m.tonPlus2 ?? 0, e: m.oneEighties2 ?? 0, hc: m.highCheckout2 ?? 0, avg: m.avg2 ?? 0 },
      ].forEach(({ id, name, t40, t60, t80, tp, e, hc, avg }) => {
        const existing = playerMap.get(id);
        const player = playerList.find(p => p.id === id);
        if (existing) {
          existing.ton40 += t40;
          existing.ton60 += t60;
          existing.ton80 += t80;
          existing.tonPlus += tp;
          existing.oneEighties += e;
          existing.totalTons += t40 + t60 + t80 + tp + e;
          if (hc > existing.highestCheckout) existing.highestCheckout = hc;
          if (avg > existing.bestAvg) existing.bestAvg = avg;
        } else {
          playerMap.set(id, {
            playerId: id,
            playerName: name,
            avatar: player?.avatar || name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
            ton40: t40, ton60: t60, ton80: t80, tonPlus: tp,
            oneEighties: e,
            totalTons: t40 + t60 + t80 + tp + e,
            highestCheckout: hc,
            bestAvg: avg,
          });
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => b.totalTons - a.totalTons);
  }, [matchList, playerList]);

  const getGlobalTonStats = useCallback(() => calcTonStats(), [calcTonStats]);
  const getLeagueTonStats = useCallback((leagueId: string) => calcTonStats(leagueId), [calcTonStats]);

  return (
    <LeagueContext.Provider value={{
      players: playerList, matches: matchList, leagues: leagueList,
      activeLeagueId, setActiveLeagueId,
      getLeagueMatches, getPlayerLeagueStats, getPlayerAllLeagueStats,
      getPlayerAchievements, getLeagueStandings,
      submitMatchResult, addMatch, approvePlayer, pendingPlayers, addPendingPlayer,
      addLeague, updateLeague, deleteLeague,
      updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
      deleteMatch,
      getGlobalTonStats, getLeagueTonStats,
    }}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueProvider");
  return ctx;
};

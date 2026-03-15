import { Users, Target, Flame, Crosshair, Trophy, UserCheck, Swords } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Gamepad2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { leagues, players, matches } = useLeague();
  const totalRegistered = players.length;
  const leagueParticipants = players.filter(p => p.leagueIds && p.leagueIds.length > 0).length;
  const activeLeagues = leagues.filter(l => l.is_active);
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  let total180s = 0;
  let bestCheckout = 0;
  let totalDartsThrown = 0;
  let bestAvg = 0;
  matches.forEach(m => {
    if (m.status === "completed") {
      total180s += (m.oneEighties1 ?? 0) + (m.oneEighties2 ?? 0);
      totalDartsThrown += (m.dartsThrown1 ?? 0) + (m.dartsThrown2 ?? 0);
      if (m.highCheckout1 != null && m.highCheckout1 > bestCheckout) bestCheckout = m.highCheckout1;
      if (m.highCheckout2 != null && m.highCheckout2 > bestCheckout) bestCheckout = m.highCheckout2;
      if (m.avg1 != null && m.avg1 > bestAvg) bestAvg = m.avg1;
      if (m.avg2 != null && m.avg2 > bestAvg) bestAvg = m.avg2;
    }
  });

  const stats = [
    { icon: <UserCheck className="h-5 w-5" />, label: "Zarejestrowani", value: totalRegistered.toString(), desc: "Kont założonych na platformie" },
    { icon: <Swords className="h-5 w-5" />, label: "Gracze w ligach", value: leagueParticipants.toString(), desc: "Aktywnych uczestników rozgrywek" },
    { icon: <Trophy className="h-5 w-5" />, label: "Aktywne ligi", value: activeLeagues.length.toString(), desc: "Trwających rozgrywek w sezonie" },
    { icon: <Target className="h-5 w-5" />, label: "Rozegrane mecze", value: totalCompleted.toString(), desc: "Zakończonych spotkań w sezonie" },
    { icon: <Crosshair className="h-5 w-5" />, label: "Rzutów lotką", value: totalDartsThrown > 0 ? formatNumber(totalDartsThrown) : "0", desc: "Łączna liczba rzutów w sezonie" },
    { icon: <Flame className="h-5 w-5" />, label: "Maksów 180", value: total180s.toString(), desc: "Perfekcyjnych podejść przy tablicy" },
    { icon: <Crosshair className="h-5 w-5" />, label: "Najwyższy checkout", value: bestCheckout > 0 ? bestCheckout.toString() : "—", desc: "Rekordowe zamknięcie w sezonie" },
    { icon: <Users className="h-5 w-5" />, label: "Najwyższa średnia", value: bestAvg > 0 ? bestAvg.toFixed(1) : "—", desc: "Rekordowa średnia w meczu" },
  ];

  return (
    <>
      {/* ─── FULLSCREEN HERO ─── */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="mb-6">
              <div className="w-10 h-1 bg-primary mb-4" />
              <span className="text-xs font-display uppercase tracking-[0.3em] text-white/50">
                Sezon 2026 · eDART Polska
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] mb-6 text-white uppercase"
            >
              Polska Liga<br />Darta
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base md:text-lg text-white/60 font-body max-w-md mb-10"
            >
              Polska liga darta rozgrywana online. Wyniki, statystyki i ranking graczy w jednym miejscu.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              <Link to="/login">
                <Button variant="hero" size="lg" className="text-sm">
                  <UserPlus className="h-4 w-4 mr-2" /> Dołącz do ligi
                </Button>
              </Link>
              <Link to="/how-to-play">
                <Button
                  size="lg"
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 font-display uppercase tracking-wider text-sm"
                >
                  <Gamepad2 className="h-4 w-4 mr-2" /> Jak to działa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATS GRID ─── */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="py-6 md:py-8 px-4 md:px-6 border-b border-r border-border last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r [&:nth-child(4)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+4)]:border-b-0 md:[&:nth-last-child(-n+2)]:border-b"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground leading-tight">{s.label}</span>
                </div>
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{s.value}</div>
                <p className="text-[11px] text-muted-foreground font-body mt-1">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ZNAJDŹ NAS ─── */}
      <section className="bg-background py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3 uppercase">Znajdź nas</h2>
            <p className="text-muted-foreground font-body max-w-lg mx-auto mb-10">
              Dołącz do naszej społeczności — bądź na bieżąco z wynikami, turniejami i newsami.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Discord */}
            <motion.a
              href="https://discord.com/invite/edartpolska"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0 }}
              className="group rounded-xl border border-border bg-card p-6 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#5865F2]/20 transition-colors">
                <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" /></svg>
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">Discord</h3>
              <p className="text-xs text-muted-foreground font-body">Główne centrum społeczności — czat, wyniki, turnieje na żywo</p>
            </motion.a>

            {/* WhatsApp */}
            <motion.a
              href="https://chat.whatsapp.com/edartpolska"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="group rounded-xl border border-border bg-card p-6 hover:border-[#25D366]/50 hover:bg-[#25D366]/5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#25D366]/20 transition-colors">
                <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">WhatsApp</h3>
              <p className="text-xs text-muted-foreground font-body">Grupa WhatsApp — szybki kontakt i ustalanie terminów meczów</p>
            </motion.a>

            {/* Facebook */}
            <motion.a
              href="https://www.facebook.com/eDartPolska/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="group rounded-xl border border-border bg-card p-6 hover:border-[#1877F2]/50 hover:bg-[#1877F2]/5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1877F2]/20 transition-colors">
                <svg className="h-6 w-6 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">Facebook</h3>
              <p className="text-xs text-muted-foreground font-body">Oficjalny profil — aktualności, relacje z turniejów i zdjęcia</p>
            </motion.a>
          </div>
        </div>
      </section>
    </>
  );
};

const formatNumber = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
};

export default HeroSection;

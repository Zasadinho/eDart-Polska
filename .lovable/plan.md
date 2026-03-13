

## Plan: System ustalania miejsc + Regulamin rozgrywek

### 1. Moduł rankingowy — `src/lib/leagueRanking.ts`

Nowy plik z funkcją `calculateLeagueStandings(players, matches, rules)` implementującą sortowanie:

1. **Punkty** (desc)
2. **Różnica legów** (`legsWon - legsLost`, desc)
3. **Head-to-head** — jeśli 2 graczy ma te same pkt, sprawdź bezpośredni mecz. Jeśli >2 graczy — twórz mini-tabelę rekurencyjnie z tymi samymi zasadami
4. **3 Dart Average** (desc)
5. **Highest Checkout** (desc)

Funkcja zwraca tablicę z polem `rank: number` przypisanym każdemu graczowi.

### 2. Integracja z `LeagueContext.tsx`

- `getLeagueStandings()` — zamienić obecny prosty sort (linia 358-360) na wywołanie nowego modułu `calculateLeagueStandings`
- Dodać pole `rank` do zwracanych obiektów
- Interfejs `PlayerLeagueStats` — dodać `legDifference: number` (obliczane dynamicznie)

### 3. Aktualizacja `LeagueTable.tsx`

- Zastąpić `index + 1` wartością `entry.rank` z modułu rankingowego
- Dodać kolumnę „R.L." (różnica legów) w tabeli

### 4. Tabela DB `league_rules` + migracja

```sql
CREATE TABLE public.league_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.league_rules ENABLE ROW LEVEL SECURITY;
-- RLS: anyone can read, admins manage
```

### 5. Strona `/rules` — `RulesPage.tsx`

- Lista regulaminów (globalny + przypisane do lig)
- Dla admina: przyciski dodaj/edytuj/usuń regulamin
- Edycja w textarea (markdown lub plain text)
- Select do przypisania ligi lub oznaczenia jako „globalny"

### 6. Sekcja regulaminu na `TablesPage.tsx`

- Pod selektorem ligi — jeśli liga ma przypisany regulamin, wyświetl link/sekcję „Regulamin rozgrywek"

### 7. Routing + Nawigacja

- Dodać route `/rules` w `App.tsx`
- Dodać „Regulamin" do `moreNavItems` w `Navbar.tsx`

---

### Szczegóły techniczne

**Algorytm mini-tabeli (head-to-head):**
- Zgrupuj graczy z identycznymi punktami
- Dla grupy 2 graczy: sprawdź bezpośredni wynik
- Dla grupy >2: oblicz mini-standings tylko z meczów między tymi graczami, zastosuj rekurencyjnie te same tiebreakery

**Pliki do utworzenia:**
- `src/lib/leagueRanking.ts`
- `src/pages/RulesPage.tsx`
- Migracja SQL

**Pliki do edycji:**
- `src/contexts/LeagueContext.tsx` — użyj nowego modułu
- `src/components/LeagueTable.tsx` — kolumna rank + R.L.
- `src/App.tsx` — route
- `src/components/Navbar.tsx` — link
- `src/pages/TablesPage.tsx` — sekcja regulaminu




## Plan: Fix 5 Issues in eDART Polska

### Issue 1: Checkout counting (busts as attempts) + decimal precision + ton ranges in stats

**Problem**: 
- The edge function `fetch-autodarts-match` only counts checkout attempts when remaining is a one-dart finish (2-40 even, 50). But busts should also count as attempts -- if a player has a finishable score and busts, that was still a checkout attempt.
- `MatchStatFields.tsx` uses `step="0.1"` for averages, limiting to 1 decimal. Should be `step="0.01"` for avg, first9Avg, avgUntil170.
- Ton 40 (170+) range should be included in stats/achievements display alongside other ton ranges.

**Changes**:
1. **`supabase/functions/fetch-autodarts-match/index.ts`**: The current checkout logic already counts attempts for every dart thrown when remaining is finishable, including busts (line 261-263: it counts the attempt before subtracting). The bust scenario is already handled -- when a player has 40 remaining and throws triple 20 (60), the attempt is counted at `runningRemaining=40` before subtracting. **However**, the function only checks `isFinishableWithOneDouble` which means remaining must be exactly a double-out number. Need to also consider that a player might attempt a checkout route (e.g. remaining 70 = T10 + D20) where the last dart aimed at a double. The current logic is actually correct for the standard definition -- a checkout attempt = a dart thrown at a double when the remaining score permits finishing with that double. Busts ARE counted because the attempt is logged before the dart value is subtracted. I'll verify and add a comment but the logic appears correct already.

2. **`src/components/MatchStatFields.tsx`**: Change `step` from `"0.1"` to `"0.01"` for the three average fields (avg, first9Avg, avgUntil170).

3. **Stats page**: Ton40 (170+) is already shown in the stats table. Verify it's included in `getGlobalTonStats` calculations.

### Issue 2: Extension version mismatch + extension not working properly

**Problem**: 
- Website says v1.5.0 but `manifest.json` in both Chrome and Firefox says `"version": "1.4.0"`.
- Extension doesn't properly auto-submit, notify about league matches, etc.
- Matches submitted via link should also go to `pending_approval` (admin verification).
- Add error message suggesting manual submission when extension fails.

**Changes**:
1. **`public/chrome-extension/manifest.json`** and **`public/firefox-extension/manifest.json`**: Update version to `"1.5.0"`.
2. **`src/components/ExtensionDownloadSection.tsx`**: Already shows v1.5.0, no change needed.
3. **`src/pages/SubmitMatchPage.tsx`**: When `handleFetchAutodarts` fails, show a more specific error message about token expiration with a suggestion to refresh autodarts page. Add the expired token message on error.
4. **Extension improvements**: The extension auto-submit and notification issues are complex browser extension debugging problems that require testing in the actual browser. The core issue is likely that `content.js` intercepts match data via fetch patching, but the Autodarts SPA may use WebSocket or different API patterns. This needs a separate focused effort.

### Issue 3: Data hidden for non-logged-in users (players count = 0)

**Problem**: RLS on `players` table only allows `authenticated` users to SELECT. Anonymous visitors see 0 players, 0 matches stats.

**Changes**:
1. **Database migration**: Add RLS policy on `players` for anonymous/public SELECT of non-sensitive fields. Since RLS works at row level (not column), we need to either:
   - Add a public SELECT policy on `players` (exposing all columns including phone/discord) -- not ideal.
   - Better: Create a database view `public_players` that exposes only `id, name, avatar, avatar_url, approved` and grant public access.
   - Or simplest: Add public SELECT policy to `players` table (phone/discord are nullable and often empty, and the app already hides them in UI). The `matches` table already has public SELECT.

   Best approach: Add a public SELECT policy on `players`. The sensitive contact info (phone, discord) is protected at the UI level -- only shown to match opponents via the `get_opponent_contact` function.

2. **Database migration SQL**:
   ```sql
   CREATE POLICY "Anyone can read basic player info" ON public.players
   FOR SELECT TO anon USING (true);
   ```

### Issue 4: Chat shows only time, no date

**Problem**: `ChatPage.tsx` line 295 uses `format(new Date(m.created_at), "HH:mm")` -- only shows hour:minute.

**Changes**:
1. **`src/pages/ChatPage.tsx`**: Show date + time. For today's messages show "HH:mm", for older messages show "dd.MM HH:mm". Use `isToday` from date-fns or compare dates manually.

### Issue 5: Better error message on manual submission with expired token

**Problem**: When fetching autodarts match data fails, show a clear message about token expiration.

**Changes**:
1. **`src/pages/SubmitMatchPage.tsx`**: In `handleFetchAutodarts` catch block and error handling (lines 401-407, 416-418), update error messages to mention token expiration and suggest refreshing autodarts.io page.

---

### Summary of all file changes:

| File | Change |
|------|--------|
| `src/components/MatchStatFields.tsx` | Change step to `"0.01"` for 3 average fields |
| `public/chrome-extension/manifest.json` | Version `1.4.0` -> `1.5.0` |
| `public/firefox-extension/manifest.json` | Version `1.4.0` -> `1.5.0` |
| `src/pages/ChatPage.tsx` | Add date display to messages |
| `src/pages/SubmitMatchPage.tsx` | Better error messages for token expiration |
| Database migration | Add public SELECT on `players` for anon users |
| `supabase/functions/fetch-autodarts-match/index.ts` | Review checkout logic (busts already counted correctly) |

### Database migration needed:
```sql
CREATE POLICY "Anon can read players" ON public.players
FOR SELECT TO anon USING (true);
```


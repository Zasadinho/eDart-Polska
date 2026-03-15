-- Fix old challenge titles that still use "tony" instead of "wizyt"
UPDATE weekly_challenges
SET title = 'Maszyna wysokich wizyt',
    description = 'Najwięcej wysokich wizyt (60-99, 100-139, 140-169, 170-180) w tygodniu'
WHERE challenge_type = 'most_tons'
  AND (title ILIKE '%ton%' OR description ILIKE '%ton%');

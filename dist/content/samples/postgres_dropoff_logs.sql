-- Simulated drop-off events (week 2 setup screen concentration)
SELECT screen_name, COUNT(*) AS drop_offs, week_number
FROM session_events
WHERE event_type = 'abandon'
  AND week_number = 2
GROUP BY screen_name, week_number;

-- setup_screen: 42% of week-2 drop-offs
-- pricing_page: 18%

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_league_name ON events(league_name);
CREATE INDEX IF NOT EXISTS idx_events_commence_time ON events(commence_time);
CREATE INDEX IF NOT EXISTS idx_odds_event_id ON odds(event_id);
CREATE INDEX IF NOT EXISTS idx_displayed_odds_event_id ON displayed_odds(event_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets(placed_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

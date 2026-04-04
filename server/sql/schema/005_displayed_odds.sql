CREATE TABLE IF NOT EXISTS displayed_odds (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) REFERENCES events(event_id),
  bookmaker_id VARCHAR(50),
  bookmaker_name VARCHAR(100),
  market_type VARCHAR(50),
  side VARCHAR(100),
  raw_odds NUMERIC(8,3),
  display_odds NUMERIC(8,3),
  is_visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, bookmaker_id, market_type, side)
);

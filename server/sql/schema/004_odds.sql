CREATE TABLE IF NOT EXISTS odds (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) REFERENCES events(event_id),
  bookmaker_id VARCHAR(50),
  bookmaker_name VARCHAR(100),
  market_type VARCHAR(50),
  side VARCHAR(100),
  decimal_odds NUMERIC(8,3),
  recorded_at TIMESTAMP DEFAULT NOW()
);

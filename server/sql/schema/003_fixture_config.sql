CREATE TABLE IF NOT EXISTS fixture_config (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) REFERENCES events(event_id),
  is_active BOOLEAN DEFAULT false,
  house_margin NUMERIC(5,2) DEFAULT 0,
  markets_enabled TEXT[] DEFAULT ARRAY['h2h'],
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id)
);

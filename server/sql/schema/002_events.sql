CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE NOT NULL,
  league_id VARCHAR(50),
  league_name VARCHAR(100),
  sport_key VARCHAR(50),
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  commence_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'upcoming',
  home_score INT,
  away_score INT,
  raw_data JSONB,
  fetched_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

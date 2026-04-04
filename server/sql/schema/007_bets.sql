CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id __USERS_ID_TYPE__ REFERENCES users(id),
  event_id VARCHAR(100) REFERENCES events(event_id),
  bookmaker_id VARCHAR(50),
  market_type VARCHAR(50),
  side VARCHAR(100),
  stake NUMERIC(12,2),
  display_odds NUMERIC(8,3),
  potential_payout NUMERIC(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  placed_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP
);

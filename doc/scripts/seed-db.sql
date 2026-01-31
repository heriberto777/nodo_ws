CREATE TABLE IF NOT EXISTS lines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  n8n_webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  rate_limit_minute INTEGER NOT NULL DEFAULT 15,
  rate_limit_hour INTEGER NOT NULL DEFAULT 300,
  rate_limit_day INTEGER NOT NULL DEFAULT 1000,
  n8n_webhook_url TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_minute INTEGER;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_hour INTEGER;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_day INTEGER;

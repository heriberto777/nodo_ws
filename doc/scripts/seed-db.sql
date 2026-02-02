CREATE TABLE IF NOT EXISTS lines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  n8n_webhook_url TEXT,
  webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_base64 BOOLEAN NOT NULL DEFAULT FALSE,
  ignore_groups BOOLEAN NOT NULL DEFAULT FALSE,
  read_messages BOOLEAN NOT NULL DEFAULT FALSE,
  rate_limit_minute INTEGER,
  rate_limit_hour INTEGER,
  rate_limit_day INTEGER,
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL,
  conversation_id INTEGER,
  direction TEXT NOT NULL,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (line_id, contact)
);

CREATE TABLE IF NOT EXISTS bot_flows (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_states (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  flow_id INTEGER REFERENCES bot_flows(id) ON DELETE SET NULL,
  state TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warmup_states (
  line_id INTEGER PRIMARY KEY REFERENCES lines(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  date_key DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_today INTEGER NOT NULL DEFAULT 0,
  limits JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_events (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
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
  alert_webhook_url TEXT,
  alert_webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  alert_min_severity TEXT NOT NULL DEFAULT 'MEDIUM',
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from TEXT,
  smtp_to TEXT,
  report_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  report_cron TEXT NOT NULL DEFAULT '0 8 * * *',
  last_report_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_minute INTEGER;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_hour INTEGER;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS rate_limit_day INTEGER;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS webhook_base64 BOOLEAN;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS ignore_groups BOOLEAN;
ALTER TABLE lines ADD COLUMN IF NOT EXISTS read_messages BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS alert_webhook_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS alert_webhook_enabled BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS alert_min_severity TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_user TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_password TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_from TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_to TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_enabled BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_cron TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS last_report_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER;

-- Cleanup legacy columns not used by current code
ALTER TABLE lines DROP COLUMN IF EXISTS webhook_by_event;
ALTER TABLE lines DROP COLUMN IF EXISTS webhook_events;
ALTER TABLE lines DROP COLUMN IF EXISTS read_status;
ALTER TABLE lines DROP COLUMN IF EXISTS sync_history;
ALTER TABLE lines DROP COLUMN IF EXISTS always_online;
ALTER TABLE lines DROP COLUMN IF EXISTS reject_calls;

-- Drop legacy events table if it exists
DROP TABLE IF EXISTS line_webhook_events;

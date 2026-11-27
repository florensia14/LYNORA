-- Soft delete for concerts.
-- Run this migration once before deploying the updated backend.
ALTER TABLE events
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;

CREATE INDEX idx_events_deleted_at ON events (deleted_at);

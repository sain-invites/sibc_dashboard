-- Migration: Add indexes for frequently queried columns
-- This improves performance for overview API queries

-- Index on user_event_log.created_at
-- Used for DAU calculations, daily event aggregation
CREATE INDEX IF NOT EXISTS idx_user_event_log_created_at
  ON user_event_log (created_at DESC);

-- Index on llm_usage.ts
-- Used for LLM cost trends, error rate calculations
CREATE INDEX IF NOT EXISTS idx_llm_usage_ts
  ON llm_usage (ts DESC);

-- Index on llm_usage.user_id
-- Used for user-specific LLM usage in user360 API
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id
  ON llm_usage (user_id);

-- Index on daily_routine_activities.ymd
-- Used for routine completion trends
CREATE INDEX IF NOT EXISTS idx_daily_routine_activities_ymd
  ON daily_routine_activities (ymd DESC);

-- Index on daily_routine_activities.completed_at
-- Used for completion rate calculations
CREATE INDEX IF NOT EXISTS idx_daily_routine_activities_completed_at
  ON daily_routine_activities (completed_at DESC) WHERE completed_at IS NOT NULL;

-- Index on daily_routine_activities.user_id
-- Used for user-specific routines in user360 API
CREATE INDEX IF NOT EXISTS idx_daily_routine_activities_user_id
  ON daily_routine_activities (user_id);

-- Index on user_event_log.user_id
-- Used for first event detection, active user tracking
CREATE INDEX IF NOT EXISTS idx_user_event_log_user_id
  ON user_event_log (user_id);

-- Composite index for date range queries on llm_usage
-- Optimizes: WHERE ts BETWEEN $1 AND $2
CREATE INDEX IF NOT EXISTS idx_llm_usage_ts_range
  ON llm_usage (ts, user_id);

-- Composite index for date range queries on user_event_log
-- Optimizes: WHERE created_at BETWEEN $1 AND $2
CREATE INDEX IF NOT EXISTS idx_user_event_log_created_at_range
  ON user_event_log (created_at, user_id);

COMMENT ON INDEX idx_user_event_log_created_at IS 'Optimizes DAU/trend queries in overview API';
COMMENT ON INDEX idx_llm_usage_ts IS 'Optimizes LLM cost/error trends in overview API';
COMMENT ON INDEX idx_llm_usage_user_id IS 'Optimizes user-specific LLM queries in user360 API';
COMMENT ON INDEX idx_daily_routine_activities_ymd IS 'Optimizes routine trend queries in overview API';
COMMENT ON INDEX idx_daily_routine_activities_completed_at IS 'Optimizes completion rate calculations in overview API';
COMMENT ON INDEX idx_daily_routine_activities_user_id IS 'Optimizes user-specific routine queries in user360 API';

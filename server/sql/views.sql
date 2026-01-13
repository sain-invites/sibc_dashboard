-- ============================================
-- 정규화 뷰 (Normalization Views)
-- ============================================
-- 
-- 목적: 
-- - 날짜/시간 컬럼 통일 (occurred_at, day)
-- - user_id 보정 (chat_threads)
-- - JSON 문자열 → jsonb 캐스팅
--
-- 사용법:
-- 1. DB 연결 후 이 스크립트 실행
-- 2. API에서 원본 테이블 대신 뷰 사용 가능
--
-- 주의: 
-- - search_path가 sibc로 설정되어 있어야 함
-- - 뷰는 읽기 전용

-- ============================================
-- 1. v_llm_usage
-- ============================================
-- 변경사항: ts → occurred_at, day 추가

CREATE OR REPLACE VIEW v_llm_usage AS
SELECT 
  id,
  user_id,
  ts AS occurred_at,
  (ts AT TIME ZONE 'Asia/Seoul')::date AS day,
  feature_key,
  call_type,
  identifier_value,
  model,
  request_id,
  input_tokens,
  output_tokens,
  total_tokens,
  cost_usd,
  latency_ms,
  status,
  error_code,
  error_message,
  NULLIF(raw_usage, '')::jsonb AS raw_usage,
  NULLIF(meta, '')::jsonb AS meta,
  session_id
FROM llm_usage;

COMMENT ON VIEW v_llm_usage IS 'LLM 사용량 정규화 뷰 - ts를 occurred_at으로, day 컬럼 추가';

-- ============================================
-- 2. v_daily_routine_activities
-- ============================================
-- 변경사항: ymd → day, is_completed 추가

CREATE OR REPLACE VIEW v_daily_routine_activities AS
SELECT 
  activity_row_id AS id,
  routine_id,
  user_id,
  ymd,
  to_date(ymd::text, 'YYYYMMDD') AS day,
  domain,
  title,
  NULLIF(activity_details, '')::jsonb AS activity_details,
  activity_no,
  completed_at,
  (completed_at IS NOT NULL) AS is_completed,
  priority,
  completion_check_type,
  completion_answer,
  weekly_goal_id,
  activity_period,
  created_at,
  updated_at
FROM daily_routine_activities;

COMMENT ON VIEW v_daily_routine_activities IS '일일 루틴 활동 정규화 뷰 - ymd를 day로, is_completed 추가';

-- ============================================
-- 3. v_chat_threads
-- ============================================
-- 변경사항: user_id NULL 보정 (thread_id에서 추출)

CREATE OR REPLACE VIEW v_chat_threads AS
SELECT 
  thread_id,
  version,
  asked_turns,
  summary,
  NULLIF(transcript_cache, '')::jsonb AS transcript_cache,
  updated_at,
  bot_type,
  finalized_at,
  (finalized_at IS NOT NULL) AS is_finalized,
  state_synced,
  COALESCE(
    user_id, 
    NULLIF(split_part(thread_id, ':', 2), '')::uuid
  ) AS user_id
FROM chat_threads;

COMMENT ON VIEW v_chat_threads IS '채팅 스레드 정규화 뷰 - user_id NULL 보정';

-- ============================================
-- 4. v_user_signature_type
-- ============================================
-- 변경사항: created_at(정수 ymd) → day

CREATE OR REPLACE VIEW v_user_signature_type AS
SELECT 
  user_id,
  created_at AS ymd,
  to_date(created_at::text, 'YYYYMMDD') AS day,
  disease_type,
  lifestyle_type,
  potential_type,
  segment_type,
  signature_type,
  signature_type_name,
  signature_type_desc,
  signature_type_explain,
  signature_type_caution,
  system_potential_type,
  signature_type_version,
  signature_type_change_reason,
  signature_type_explain_summary
FROM user_signature_type;

COMMENT ON VIEW v_user_signature_type IS '사용자 시그니처 타입 정규화 뷰 - created_at(ymd)를 day로';

-- ============================================
-- 5. v_user_event_log
-- ============================================
-- 변경사항: seq → id, created_at → occurred_at, day 추가

CREATE OR REPLACE VIEW v_user_event_log AS
SELECT 
  seq AS id,
  user_id,
  event_type,
  created_at AS occurred_at,
  created_at::date AS day
FROM user_event_log;

COMMENT ON VIEW v_user_event_log IS '사용자 이벤트 로그 정규화 뷰 - seq를 id로, day 추가';

-- ============================================
-- 6. v_send_messages
-- ============================================
-- 변경사항: msg_id → id, transmit_title → title, transmit_msg → body

CREATE OR REPLACE VIEW v_send_messages AS
SELECT 
  msg_id AS id,
  user_id,
  transmit_title AS title,
  transmit_msg AS body,
  sent,
  created_at,
  updated_at
FROM send_messages;

COMMENT ON VIEW v_send_messages IS '발송 메시지 정규화 뷰 - 컬럼명 통일';

-- ============================================
-- 7. v_processing_jobs
-- ============================================
-- 변경사항: duration_ms 계산 추가

CREATE OR REPLACE VIEW v_processing_jobs AS
SELECT 
  id,
  user_id,
  status,
  error,
  started_at,
  finished_at,
  CASE 
    WHEN finished_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000 
    ELSE NULL 
  END AS duration_ms,
  client_id,
  transaction_id
FROM processing_jobs;

COMMENT ON VIEW v_processing_jobs IS '처리 잡 정규화 뷰 - duration_ms 추가';

-- ============================================
-- 8. v_user_state_validation_logs
-- ============================================
-- 변경사항: ymd → day

CREATE OR REPLACE VIEW v_user_state_validation_logs AS
SELECT 
  user_id,
  thread_id,
  bot_type,
  ymd,
  to_date(ymd::text, 'YYYYMMDD') AS day,
  reason_code,
  reason_text,
  created_at
FROM user_state_validation_logs;

COMMENT ON VIEW v_user_state_validation_logs IS '사용자 상태 검증 로그 정규화 뷰 - day 추가';

-- ============================================
-- 인덱스 권장 (성능 최적화)
-- ============================================
-- 
-- 아래 인덱스는 대시보드 쿼리 성능 향상을 위해 권장됩니다.
-- 운영 환경에서 테이블 크기와 쿼리 패턴에 따라 선택적으로 적용하세요.
--
-- CREATE INDEX IF NOT EXISTS idx_llm_usage_ts ON llm_usage ((ts AT TIME ZONE 'Asia/Seoul')::date);
-- CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON llm_usage (user_id);
-- CREATE INDEX IF NOT EXISTS idx_daily_routine_activities_ymd ON daily_routine_activities (to_date(ymd::text, 'YYYYMMDD'));
-- CREATE INDEX IF NOT EXISTS idx_daily_routine_activities_user_id ON daily_routine_activities (user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_event_log_created_at ON user_event_log (created_at::date);
-- CREATE INDEX IF NOT EXISTS idx_user_event_log_user_id ON user_event_log (user_id);
-- CREATE INDEX IF NOT EXISTS idx_processing_jobs_started_at ON processing_jobs (started_at::date);
-- CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs (user_id);

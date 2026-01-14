# 서비스 현황 대시보드

Invites Loop 서비스의 운영 지표와 사용자 활동을 한눈에 파악할 수 있는 경영진용 대시보드입니다. React 19 + Vite 기반의 프런트엔드와 Express API가 결합된 풀스택 TypeScript 구성으로 실시간 모니터링에 최적화되어 있습니다.

## 개요

이 대시보드는 PostgreSQL 집계 데이터를 기반으로 KPI, 사용자 트렌드, 루틴 수행 현황, LLM 비용/오류 지표 등을 시각화합니다. 관리자 관점의 의사결정에 필요한 핵심 지표를 빠르게 확인할 수 있도록 설계되어 있습니다.

## 주요 기능

- 전체 KPI(사용자 수, DAU/WAU/MAU, 이벤트 평균) 대시보드
- LLM 호출량/비용/오류율 등 운영 지표 분석
- 루틴 생성/수행 트렌드 및 미수행 영역 분석
- 사용자 디렉토리(검색, 페이지네이션, 활동 지표)
- User 360 상세 뷰(프로필, 루틴, 커뮤니케이션, 운영 지표)
- 전역 날짜 필터링
- 컴포넌트 가이드(`/guide`)에서 데이터 출처/계산식 확인

## 기술 스택

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Radix UI, Wouter
- **Backend**: Express (Node.js), PostgreSQL (`pg`), TypeScript
- **Tooling**: pnpm, esbuild(서버 번들), Prettier, Vitest

## 프로젝트 구조

```text
./
├── client/                # Vite 루트 + React UI
│   └── src/
│       ├── components/    # KPI, 차트, 테이블 등 UI
│       ├── pages/         # Home, User360, ComponentGuide, NotFound
│       └── lib/           # 포맷터/유틸
├── server/                # Express API
│   ├── routes/            # Overview, Users, User360
│   ├── sql/               # 마이그레이션/뷰
│   └── index.ts           # 서버 엔트리
├── dist/                  # 빌드 산출물
└── patches/               # pnpm 패치
```

## 라우팅

| 경로            | 설명                   |
| --------------- | ---------------------- |
| `/`             | 서비스 오버뷰 대시보드 |
| `/user`         | User 360 기본 진입     |
| `/user/:userId` | 사용자별 User 360 상세 |
| `/guide`        | 컴포넌트 데이터 가이드 |
| `/404`          | Not Found              |

## 시작하기

### 사전 요구 사항

- Node.js (LTS)
- pnpm
- PostgreSQL (실데이터 연동 시 필요)

### 설치

```bash
pnpm install
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
PORT=3001
DB_HOST=your_host
DB_PORT=5432
DB_NAME=invites_loop
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=true
```

## 스크립트

| 명령어               | 설명                                      |
| -------------------- | ----------------------------------------- |
| `pnpm dev`           | Vite 개발 서버 실행                       |
| `pnpm build`         | 클라이언트 빌드 + 서버 번들링 (`dist/`)   |
| `pnpm start`         | 프로덕션 서버 실행 (`dist/`, `.env` 필요) |
| `pnpm preview`       | 클라이언트 빌드 미리보기                  |
| `pnpm check`         | TypeScript 타입 체크                      |
| `pnpm format`        | Prettier 포맷 적용                        |
| `pnpm test`          | Vitest 실행                               |
| `pnpm test:run`      | Vitest 1회 실행                           |
| `pnpm test:ui`       | Vitest UI 실행                            |
| `pnpm test:coverage` | 테스트 커버리지 생성                      |

## 컴포넌트 데이터 정의

이 대시보드는 `invites_loop`의 실데이터를 집계하여 시각화합니다. 아래 표는 각 컴포넌트가 어떤 테이블/컬럼을 사용하고 어떤 계산식으로 표현되는지 요약한 것입니다. (UI에서는 `/guide`에서 동일한 내용을 확인할 수 있습니다.)

### Service Overview

**API**: `GET /api/overview`, `GET /api/users`

| 컴포넌트       | 데이터 항목      | 테이블/컬럼                                                                | 계산식/로직                                     |
| -------------- | ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| KPICard        | 총 사용자        | `user_profiles.user_id`                                                    | `COUNT(DISTINCT user_id)`                       |
| KPICard        | DAU/WAU/MAU      | `user_event_log.user_id`, `created_at`                                     | 기간별 고유 사용자 수 집계                      |
| KPICard        | 루틴 수행률      | `daily_routine_activities.completed_at`, `ymd`                             | `완료 / 전체 * 100`                             |
| KPICard        | LLM 비용/에러율  | `llm_usage.cost_usd`, `status`, `error_code`, `ts`                         | 비용 합계, `(error / total) * 100`              |
| TrendChart     | 신규/복귀 사용자 | `user_event_log.created_at`, `user_id`                                     | 신규: 최초 이벤트 날짜 기준, 복귀: `DAU - 신규` |
| TrendChart     | 루틴 완료/완료율 | `daily_routine_activities.ymd`, `completed_at`                             | `COUNT`, `completed / total * 100`              |
| TrendChart     | LLM 오류율/비용  | `llm_usage.ts`, `status`, `error_code`, `cost_usd`                         | `(error / total) * 100`, `SUM(cost) / COUNT(*)` |
| BreakdownChart | 비용 분석        | `llm_usage.call_type`, `model`, `cost_usd`                                 | 그룹 합계, Top 10                               |
| BreakdownChart | 수행율 분해      | `daily_routine_activities.domain`, `priority`, `activity_period`           | `completed / total * 100`                       |
| UserTable      | 사용자 목록      | `user_profiles`, `user_event_log`, `daily_routine_activities`, `llm_usage` | 이벤트/루틴/비용 집계, 완료율 계산              |
| DateFilter     | 기간 필터        | 전역 상태                                                                  | 모든 API에 `start`, `end` 전달                  |

### User 360

**API**: `GET /api/user360/:userId`

| 탭           | 데이터 항목         | 테이블/컬럼                                                                                 | 계산식/로직                           |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| 요약         | 프로필/시그니처     | `user_profiles`, `user_signature_type`                                                      | 최신 시그니처(ymd 기준) + 프로필 요약 |
| 요약         | 대사량/상태         | `target_calorie.target_daily_calorie`, `calorie_calculation_basis`, `health_status_summary` | JSON 기반 계산 값 파싱                |
| 요약         | 라이프스타일 가이드 | `user_guardrail.patient_summary`, `lifestyle_guide_json`                                    | 최신 레코드 기준                      |
| 루틴         | 주간 플랜/목표      | `weekly_routine_plan`, `weekly_routine_goal`                                                | 최신 플랜 + 목표별 완료율             |
| 루틴         | 일별 수행률         | `daily_routine_activities.ymd`, `completed_at`                                              | 일자별 `planned/ completed` 집계      |
| 커뮤니케이션 | 발송 메시지         | `send_messages.msg_id`, `transmit_title`, `transmit_msg`, `sent`                            | 최근 10건 + 발송/대기 통계            |
| 커뮤니케이션 | 채팅 스레드         | `chat_threads`, `chat_threads_turns`                                                        | 스레드 요약 + 턴 기록 파싱            |
| 운영/비용    | LLM 사용량          | `llm_usage.call_type`, `cost_usd`, `latency_ms`, `ts`                                       | 타입별 호출/비용/지연 집계            |
| 운영/비용    | 처리 실패/검증 실패 | `processing_jobs`, `user_state_validation_logs`                                             | 실패 작업/검증 로그 최신 10건         |

### 날짜 및 시간 기준

- 시간대: `Asia/Seoul` 기준으로 날짜를 계산합니다.
- 필터 기준 컬럼: `user_event_log.created_at`, `llm_usage.ts`, `daily_routine_activities.ymd`.

## 개발/운영 참고

- Vite 루트는 `client/`이며, 클라이언트 빌드 출력은 `dist/public`입니다.
- 서버 번들은 `dist/index.js`로 생성됩니다.
- 서버 ESM 로컬 import는 `.js` 확장자를 포함해야 합니다.
- 경로 별칭: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets` (디렉터리 존재 여부와 무관)
- 타입 전용 import는 `import type` 사용을 권장합니다.

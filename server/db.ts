/**
 * PostgreSQL 데이터베이스 연결 모듈
 * 
 * - Pool 기반 연결 관리
 * - search_path를 sibc로 설정하여 스키마 접두사 생략
 * - 환경변수로 접속 정보 관리
 */

import pg from 'pg';

const { Pool } = pg;

// 환경변수에서 DB 접속 정보 로드
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'invites_loop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 연결 시 search_path 설정
pool.on('connect', (client) => {
  client.query('SET search_path TO sibc, public');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * SQL 쿼리 실행 헬퍼
 * @param sql SQL 문자열
 * @param params 파라미터 배열
 * @returns 쿼리 결과
 */
export async function query(
  sql: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<pg.QueryResult> {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

/**
 * 단일 행 조회 헬퍼
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<T | null> {
  const result = await query(sql, params);
  return (result.rows[0] as T) || null;
}

/**
 * 여러 행 조회 헬퍼
 */
export async function queryMany<T = Record<string, unknown>>(
  sql: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<T[]> {
  const result = await query(sql, params);
  return result.rows as T[];
}

/**
 * 트랜잭션 실행 헬퍼
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * DB 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as test');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Pool 종료 (서버 종료 시 호출)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;

/**
 * TLE(SGP4) + 케플러(2체) 통합 전파 인터페이스.
 *
 * 좌표계: 반환 상태벡터는 ECI(TEME) [km, km/s].
 * 시각: 항상 UTC. Date는 이 모듈 경계에서만 생성한다.
 */
import * as satellite from 'satellite.js';
import type { OrbitSource, StateVector } from '../types';
import { keplerToEci, orbitalPeriodSecFromA } from './kepler';
import { SEC_PER_MIN } from './constants';

/** TLE → satrec 캐시 (동일 TLE 반복 파싱 방지) */
const satrecCache = new Map<string, satellite.SatRec>();

export function getSatrec(line1: string, line2: string): satellite.SatRec {
  const key = `${line1}\n${line2}`;
  let rec = satrecCache.get(key);
  if (!rec) {
    rec = satellite.twoline2satrec(line1, line2);
    satrecCache.set(key, rec);
  }
  return rec;
}

/** TLE 한 줄의 체크섬(마지막 자리) 검증. '-'는 1로 계산. */
export function tleChecksumOk(line: string): boolean {
  if (line.length < 69) return false;
  let sum = 0;
  for (let i = 0; i < 68; i++) {
    const ch = line[i];
    if (ch >= '0' && ch <= '9') sum += ch.charCodeAt(0) - 48;
    else if (ch === '-') sum += 1;
  }
  return sum % 10 === Number(line[68]);
}

/** TLE 2줄의 형식/체크섬/파싱 가능 여부 검증. 실패 사유 문자열 반환, 성공 시 null. */
export function validateTle(line1: string, line2: string): string | null {
  const l1 = line1.trimEnd();
  const l2 = line2.trimEnd();
  if (l1.length !== 69) return `Line 1 길이가 69가 아닙니다 (${l1.length})`;
  if (l2.length !== 69) return `Line 2 길이가 69가 아닙니다 (${l2.length})`;
  if (!l1.startsWith('1 ')) return 'Line 1은 "1 "로 시작해야 합니다';
  if (!l2.startsWith('2 ')) return 'Line 2는 "2 "로 시작해야 합니다';
  if (l1.slice(2, 7) !== l2.slice(2, 7)) return '두 줄의 위성 카탈로그 번호가 다릅니다';
  if (!tleChecksumOk(l1)) return 'Line 1 체크섬 불일치';
  if (!tleChecksumOk(l2)) return 'Line 2 체크섬 불일치';

  const rec = satellite.twoline2satrec(l1, l2);
  if (rec.error !== 0) return `SGP4 초기화 실패 (error code ${rec.error})`;
  // epoch에서 실제 전파가 되는지 1회 확인
  const probe = satellite.propagate(rec, jdToDate(rec.jdsatepoch));
  if (!probe || typeof probe.position === 'boolean') return 'epoch에서 전파 실패';
  return null;
}

/** 율리우스일 → Date(UTC) */
export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400_000);
}

/** 궤도 소스의 epoch [UTC ms] */
export function epochMsOf(source: OrbitSource): number {
  if (source.kind === 'kepler') return source.epochMs;
  const rec = getSatrec(source.line1, source.line2);
  return jdToDate(rec.jdsatepoch).getTime();
}

/**
 * 통합 전파. 실패(SGP4 decay 등) 시 null.
 * @param atMs 목표 시각 [UTC ms]
 */
export function propagate(source: OrbitSource, atMs: number): StateVector | null {
  if (source.kind === 'kepler') {
    try {
      return keplerToEci(source, atMs);
    } catch {
      return null;
    }
  }
  const rec = getSatrec(source.line1, source.line2);
  const pv = satellite.propagate(rec, new Date(atMs));
  // satellite.js는 실패 시 false/undefined position을 반환할 수 있다 — 반드시 체크
  if (
    !pv ||
    typeof pv.position === 'boolean' ||
    typeof pv.velocity === 'boolean' ||
    !pv.position ||
    !pv.velocity
  ) {
    return null;
  }
  return {
    positionEci: { x: pv.position.x, y: pv.position.y, z: pv.position.z },
    velocityEci: { x: pv.velocity.x, y: pv.velocity.y, z: pv.velocity.z },
  };
}

/** Date 인터페이스가 필요한 곳을 위한 오버로드 헬퍼 */
export function propagateAt(source: OrbitSource, at: Date): StateVector | null {
  return propagate(source, at.getTime());
}

/** 궤도 주기 [s] */
export function orbitalPeriodSec(source: OrbitSource): number {
  if (source.kind === 'kepler') return orbitalPeriodSecFromA(source.a_km);
  const rec = getSatrec(source.line1, source.line2);
  // rec.no: 평균운동 [rad/min]
  return ((2 * Math.PI) / rec.no) * SEC_PER_MIN;
}

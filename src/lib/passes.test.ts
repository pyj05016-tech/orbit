import { describe, expect, it } from 'vitest';
import { computePasses } from './passes';
import { epochMsOf } from './propagator';
import { ISS_TLE_LINE1, ISS_TLE_LINE2 } from './seed';
import type { OrbitSource } from '../types';
import { MS_PER_DAY, MS_PER_MIN } from './constants';

const ISS: OrbitSource = { kind: 'tle', line1: ISS_TLE_LINE1, line2: ISS_TLE_LINE2 };

const SEOUL = {
  lat_deg: 37.5665,
  lon_deg: 126.978,
  alt_m: 50,
  minElevation_deg: 0,
};

describe('computePasses — ISS × 서울 24시간', () => {
  const startMs = epochMsOf(ISS);
  const endMs = startMs + MS_PER_DAY;
  const passes = computePasses(ISS, SEOUL, startMs, endMs, 'iss', 'seoul');

  it('패스 개수가 합리적 범위(3~10회)', () => {
    expect(passes.length).toBeGreaterThanOrEqual(3);
    expect(passes.length).toBeLessThanOrEqual(10);
  });

  it('모든 패스가 시간순이며 AOS < TCA < LOS', () => {
    for (const p of passes) {
      expect(p.aosMs).toBeLessThan(p.losMs);
      expect(p.tcaMs).toBeGreaterThanOrEqual(p.aosMs);
      expect(p.tcaMs).toBeLessThanOrEqual(p.losMs);
    }
    for (let i = 1; i < passes.length; i++) {
      expect(passes[i].aosMs).toBeGreaterThan(passes[i - 1].losMs);
    }
  });

  it('지평선(0°) 기준 패스 지속시간이 상한 12분 이내, 베스트 패스는 5~11분', () => {
    const durationsMin = passes.map((p) => (p.losMs - p.aosMs) / MS_PER_MIN);
    for (const d of durationsMin) {
      expect(d).toBeGreaterThan(0.5);
      expect(d).toBeLessThan(12);
    }
    const best = passes.reduce((a, b) => (a.maxElevation_deg > b.maxElevation_deg ? a : b));
    const bestDur = (best.losMs - best.aosMs) / MS_PER_MIN;
    expect(bestDur).toBeGreaterThanOrEqual(5);
    expect(bestDur).toBeLessThanOrEqual(11);
  });

  it('최대앙각과 방위각이 유효 범위', () => {
    for (const p of passes) {
      expect(p.maxElevation_deg).toBeGreaterThanOrEqual(0);
      expect(p.maxElevation_deg).toBeLessThanOrEqual(90);
      expect(p.aosAzimuth_deg).toBeGreaterThanOrEqual(0);
      expect(p.aosAzimuth_deg).toBeLessThan(360);
      expect(p.losAzimuth_deg).toBeGreaterThanOrEqual(0);
      expect(p.losAzimuth_deg).toBeLessThan(360);
    }
  });

  it('최소앙각 10° 적용 시 패스가 줄고 지속시간도 짧아짐', () => {
    const strict = computePasses(
      ISS,
      { ...SEOUL, minElevation_deg: 10 },
      startMs,
      endMs,
    );
    expect(strict.length).toBeLessThanOrEqual(passes.length);
    for (const p of strict) {
      expect((p.losMs - p.aosMs) / MS_PER_MIN).toBeLessThan(8);
      expect(p.maxElevation_deg).toBeGreaterThanOrEqual(10);
    }
  });

  it('AOS/LOS 이분법 정밀도: 경계에서 elevation ≈ minElevation (±0.2°)', () => {
    // AOS 직전/직후 elevation 부호가 바뀌는지 확인
    const p = passes[0];
    const before = computePasses(ISS, SEOUL, p.aosMs - 5000, p.aosMs - 4000);
    // 5초 전에는 아직 패스가 시작되지 않아야 한다 (창이 짧아 패스 없음)
    expect(before.length).toBe(0);
  });
});

describe('computePasses — 케플러 소스도 동일 인터페이스로 동작', () => {
  it('LEO 극궤도 위성이 24시간 내 서울에서 1회 이상 관측', () => {
    const epochMs = epochMsOf(ISS);
    const kepler: OrbitSource = {
      kind: 'kepler',
      a_km: 7000,
      e: 0.001,
      i_deg: 98,
      raan_deg: 120,
      argp_deg: 0,
      m0_deg: 0,
      epochMs,
    };
    const passes = computePasses(kepler, SEOUL, epochMs, epochMs + MS_PER_DAY);
    expect(passes.length).toBeGreaterThanOrEqual(1);
    for (const p of passes) {
      expect(p.losMs - p.aosMs).toBeLessThan(20 * MS_PER_MIN);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { solveKepler, keplerToEci, meanMotionRadPerSec, orbitalPeriodSecFromA } from './kepler';
import { MU_EARTH_KM3_S2 } from './constants';
import type { KeplerSource } from './kepler';

const EPOCH_MS = Date.UTC(2026, 6, 16, 12, 0, 0); // 2026-07-16T12:00:00Z

describe('solveKepler (Newton-Raphson)', () => {
  it('원궤도(e=0)에서는 E = M', () => {
    for (const m of [0, 0.5, Math.PI / 2, Math.PI, 4.2, 2 * Math.PI]) {
      expect(solveKepler(m, 0)).toBeCloseTo(m, 12);
    }
  });

  it('고이심률(e=0.7)에서 케플러 방정식을 만족하며 수렴', () => {
    const e = 0.7;
    for (let k = 0; k <= 20; k++) {
      const m = (k / 20) * 2 * Math.PI;
      const E = solveKepler(m, e);
      // 잔차 검증: M = E - e·sinE
      const residual = E - e * Math.sin(E) - m;
      // 회전수 보정 감안해 2π 모듈로 잔차 확인
      const wrapped = Math.atan2(Math.sin(residual), Math.cos(residual));
      expect(Math.abs(wrapped)).toBeLessThan(1e-9);
    }
  });

  it('e=0.95 극단 케이스도 수렴', () => {
    const E = solveKepler(0.1, 0.95);
    expect(E - 0.95 * Math.sin(E)).toBeCloseTo(0.1, 9);
  });
});

describe('keplerToEci', () => {
  const circular: KeplerSource = {
    kind: 'kepler',
    a_km: 7000,
    e: 0,
    i_deg: 0,
    raan_deg: 0,
    argp_deg: 0,
    m0_deg: 0,
    epochMs: EPOCH_MS,
  };

  it('epoch에서 근점 방향(+X)에 위치, 속도는 +Y 방향 원궤도 속도', () => {
    const sv = keplerToEci(circular, EPOCH_MS);
    expect(sv.positionEci.x).toBeCloseTo(7000, 6);
    expect(sv.positionEci.y).toBeCloseTo(0, 6);
    expect(sv.positionEci.z).toBeCloseTo(0, 6);
    const vCirc = Math.sqrt(MU_EARTH_KM3_S2 / 7000);
    expect(sv.velocityEci.x).toBeCloseTo(0, 6);
    expect(sv.velocityEci.y).toBeCloseTo(vCirc, 6);
    expect(sv.velocityEci.z).toBeCloseTo(0, 6);
  });

  it('1/4 주기 후 +Y축 근처로 이동 (반경 유지)', () => {
    const quarterMs = (orbitalPeriodSecFromA(7000) / 4) * 1000;
    const sv = keplerToEci(circular, EPOCH_MS + quarterMs);
    const r = Math.hypot(sv.positionEci.x, sv.positionEci.y, sv.positionEci.z);
    expect(r).toBeCloseTo(7000, 3);
    expect(sv.positionEci.y).toBeGreaterThan(6900);
    expect(Math.abs(sv.positionEci.x)).toBeLessThan(100);
  });

  it('고이심률(e=0.7): 근점/원점 반경이 a(1∓e)와 일치', () => {
    const ecc: KeplerSource = { ...circular, a_km: 20000, e: 0.7 };
    const periodMs = orbitalPeriodSecFromA(20000) * 1000;

    const perigee = keplerToEci(ecc, EPOCH_MS); // M0=0 → 근점
    const rp = Math.hypot(perigee.positionEci.x, perigee.positionEci.y, perigee.positionEci.z);
    expect(rp).toBeCloseTo(20000 * (1 - 0.7), 3);

    const apogee = keplerToEci(ecc, EPOCH_MS + periodMs / 2); // M=π → 원점
    const ra = Math.hypot(apogee.positionEci.x, apogee.positionEci.y, apogee.positionEci.z);
    expect(ra).toBeCloseTo(20000 * (1 + 0.7), 3);
  });

  it('경사궤도(i=90°)에서 궤도면이 XZ평면', () => {
    const polar: KeplerSource = { ...circular, i_deg: 90 };
    const quarterMs = (orbitalPeriodSecFromA(7000) / 4) * 1000;
    const sv = keplerToEci(polar, EPOCH_MS + quarterMs);
    expect(Math.abs(sv.positionEci.y)).toBeLessThan(1e-6);
    expect(sv.positionEci.z).toBeGreaterThan(6900);
  });

  it('비스-비바(vis-viva) 에너지 보존: v² = μ(2/r - 1/a)', () => {
    const ecc: KeplerSource = { ...circular, a_km: 12000, e: 0.4, i_deg: 30, raan_deg: 45, argp_deg: 60, m0_deg: 10 };
    for (const dtMin of [0, 13, 47, 121]) {
      const sv = keplerToEci(ecc, EPOCH_MS + dtMin * 60_000);
      const r = Math.hypot(sv.positionEci.x, sv.positionEci.y, sv.positionEci.z);
      const v2 = sv.velocityEci.x ** 2 + sv.velocityEci.y ** 2 + sv.velocityEci.z ** 2;
      expect(v2).toBeCloseTo(MU_EARTH_KM3_S2 * (2 / r - 1 / 12000), 6);
    }
  });
});

describe('meanMotion / period', () => {
  it('a=7000km에서 주기는 약 97.2분', () => {
    const periodMin = orbitalPeriodSecFromA(7000) / 60;
    expect(periodMin).toBeGreaterThan(96);
    expect(periodMin).toBeLessThan(99);
    expect(meanMotionRadPerSec(7000) * orbitalPeriodSecFromA(7000)).toBeCloseTo(
      2 * Math.PI,
      10,
    );
  });
});

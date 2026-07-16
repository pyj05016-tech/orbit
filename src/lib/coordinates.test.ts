import { describe, expect, it } from 'vitest';
import * as satellite from 'satellite.js';
import { eciToGeodetic, eciToLookAngles, normalizeLonDeg, gmstAt } from './coordinates';
import { RAD2DEG } from './constants';

// 고정 시각 — 회귀 기준값 산출에 사용
const T_MS = Date.UTC(2026, 6, 16, 12, 0, 0); // 2026-07-16T12:00:00Z

describe('normalizeLonDeg', () => {
  it('[-180, 180) 정규화', () => {
    expect(normalizeLonDeg(0)).toBe(0);
    expect(normalizeLonDeg(190)).toBe(-170);
    expect(normalizeLonDeg(-190)).toBe(170);
    expect(normalizeLonDeg(360)).toBe(0);
    expect(normalizeLonDeg(180)).toBe(-180);
  });
});

describe('eciToGeodetic', () => {
  it('적도면 ECI 점 → 위도 0, 경도 = RA - GMST', () => {
    const r = 7000;
    const gmst = gmstAt(T_MS);
    // ECI x축 위의 점: 적경 0 → 지리 경도 = -gmst
    const gd = eciToGeodetic({ x: r, y: 0, z: 0 }, T_MS);
    expect(gd.lat_deg).toBeCloseTo(0, 6);
    const expectedLon = normalizeLonDeg(-gmst * RAD2DEG);
    expect(gd.lon_deg).toBeCloseTo(expectedLon, 6);
    // 적도 상공 고도 = r - 적도반경
    expect(gd.height_km).toBeCloseTo(7000 - 6378.137, 1);
  });

  it('회귀: 알려진 ECI/시각 조합의 측지 출력이 satellite.js 기준과 일치', () => {
    const posEci = { x: 5000, y: 3000, z: 2500 };
    const gd = eciToGeodetic(posEci, T_MS);
    // 기준 구현(satellite.js 직접 호출)과 비교
    const ref = satellite.eciToGeodetic(
      posEci as satellite.EciVec3<number>,
      satellite.gstime(new Date(T_MS)),
    );
    expect(gd.lat_deg).toBeCloseTo(satellite.degreesLat(ref.latitude), 9);
    expect(gd.lon_deg).toBeCloseTo(normalizeLonDeg(satellite.degreesLong(ref.longitude)), 9);
    expect(gd.height_km).toBeCloseTo(ref.height, 9);
    // 절대값 회귀 고정(스냅샷): 위도는 asin(z/r) 근처
    const r = Math.hypot(posEci.x, posEci.y, posEci.z);
    expect(Math.abs(gd.lat_deg - Math.asin(posEci.z / r) * RAD2DEG)).toBeLessThan(0.3);
  });
});

describe('eciToLookAngles', () => {
  it('관측자 천정 방향 위성 → elevation ≈ 90°', () => {
    const obs = { lat_deg: 0, lon_deg: 0, alt_m: 0 };
    const gmst = gmstAt(T_MS);
    // 지리 경도 0 → ECI 적경 = gmst. 적도 상공 700km.
    const r = 6378.137 + 700;
    const posEci = { x: r * Math.cos(gmst), y: r * Math.sin(gmst), z: 0 };
    const la = eciToLookAngles(obs, posEci, T_MS);
    expect(la.elevation_deg).toBeGreaterThan(89.5);
    expect(la.range_km).toBeCloseTo(700, 0);
  });

  it('지구 반대편 위성 → elevation < 0', () => {
    const obs = { lat_deg: 0, lon_deg: 0, alt_m: 0 };
    const gmst = gmstAt(T_MS);
    const r = 6378.137 + 700;
    const posEci = { x: -r * Math.cos(gmst), y: -r * Math.sin(gmst), z: 0 };
    const la = eciToLookAngles(obs, posEci, T_MS);
    expect(la.elevation_deg).toBeLessThan(0);
    expect(la.azimuth_deg).toBeGreaterThanOrEqual(0);
    expect(la.azimuth_deg).toBeLessThan(360);
  });
});

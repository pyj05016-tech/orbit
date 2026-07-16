import { describe, expect, it } from 'vitest';
import { antisolarPoint, subsolarPoint, sunPosition } from './sun';

describe('sunPosition / subsolarPoint', () => {
  it('춘분(2026-03-20 무렵) 적위 ≈ 0°', () => {
    const { declination_deg } = sunPosition(Date.UTC(2026, 2, 20, 12, 0, 0));
    expect(Math.abs(declination_deg)).toBeLessThan(1);
  });

  it('하지(2026-06-21 무렵) 적위 ≈ +23.4°', () => {
    const { declination_deg } = sunPosition(Date.UTC(2026, 5, 21, 12, 0, 0));
    expect(declination_deg).toBeGreaterThan(23);
    expect(declination_deg).toBeLessThan(23.8);
  });

  it('동지(2026-12-21 무렵) 적위 ≈ -23.4°', () => {
    const { declination_deg } = sunPosition(Date.UTC(2026, 11, 21, 12, 0, 0));
    expect(declination_deg).toBeLessThan(-23);
    expect(declination_deg).toBeGreaterThan(-23.8);
  });

  it('7월 중순 적위 ≈ +21° (북반구 여름)', () => {
    const { declination_deg } = sunPosition(Date.UTC(2026, 6, 16, 12, 0, 0));
    expect(declination_deg).toBeGreaterThan(20);
    expect(declination_deg).toBeLessThan(22.5);
  });

  it('ECI 방향은 단위벡터', () => {
    const { eciUnit } = sunPosition(Date.UTC(2026, 6, 16, 0, 0, 0));
    expect(Math.hypot(eciUnit.x, eciUnit.y, eciUnit.z)).toBeCloseTo(1, 10);
  });

  it('12:00 UTC 직하점 경도 ≈ 0° (균시차 ±4° 이내)', () => {
    const sub = subsolarPoint(Date.UTC(2026, 6, 16, 12, 0, 0));
    expect(Math.abs(sub.lon_deg)).toBeLessThan(4);
  });

  it('00:00 UTC 직하점 경도 ≈ ±180° (자정 반대편)', () => {
    const sub = subsolarPoint(Date.UTC(2026, 6, 16, 0, 0, 0));
    expect(Math.abs(Math.abs(sub.lon_deg) - 180)).toBeLessThan(4);
  });

  it('6시간 간격으로 직하점이 서쪽으로 ~90°씩 이동', () => {
    const t0 = Date.UTC(2026, 6, 16, 12, 0, 0);
    const a = subsolarPoint(t0);
    const b = subsolarPoint(t0 + 6 * 3600_000);
    let delta = a.lon_deg - b.lon_deg;
    if (delta < 0) delta += 360;
    expect(delta).toBeGreaterThan(88);
    expect(delta).toBeLessThan(92);
  });

  it('대일점은 직하점의 대척점', () => {
    const t = Date.UTC(2026, 6, 16, 9, 30, 0);
    const sub = subsolarPoint(t);
    const anti = antisolarPoint(t);
    expect(anti.lat_deg).toBeCloseTo(-sub.lat_deg, 10);
    let dLon = Math.abs(anti.lon_deg - sub.lon_deg);
    if (dLon > 180) dLon = 360 - dLon;
    expect(dLon).toBeCloseTo(180, 8);
  });
});

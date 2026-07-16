/**
 * 태양 위치 계산 (저정밀 태양 역서 — Meeus/Vallado 근사, 오차 ≪ 0.5°).
 *
 * 좌표계: ECI(TEME 근사) 단위벡터, 측지 직하점(subsolar point)은 deg.
 * 낮/밤 터미네이터 표시 용도로 충분한 정밀도.
 */
import { gstime } from 'satellite.js';
import { DEG2RAD, RAD2DEG } from './constants';
import { normalizeLonDeg } from './coordinates';

const J2000_JD = 2451545.0;
const MS_PER_DAY = 86400_000;
const UNIX_EPOCH_JD = 2440587.5;

/** UTC ms → J2000 기준 경과 일수 */
function daysSinceJ2000(atMs: number): number {
  return atMs / MS_PER_DAY + UNIX_EPOCH_JD - J2000_JD;
}

export interface SunPosition {
  /** ECI 단위벡터 (지구 → 태양 방향) */
  eciUnit: { x: number; y: number; z: number };
  /** 적위 [deg] = 직하점 위도 */
  declination_deg: number;
  /** 적경 [deg] */
  rightAscension_deg: number;
}

/** 태양의 ECI 방향과 적경/적위 */
export function sunPosition(atMs: number): SunPosition {
  const n = daysSinceJ2000(atMs);

  // 평균 황경 L, 평균 근점이각 g [deg]
  const L_deg = (280.46 + 0.9856474 * n) % 360;
  const g_rad = ((357.528 + 0.9856003 * n) % 360) * DEG2RAD;

  // 황경 λ (중심차 보정) [deg]
  const lambda_rad =
    (L_deg + 1.915 * Math.sin(g_rad) + 0.02 * Math.sin(2 * g_rad)) * DEG2RAD;

  // 황도 경사각 ε [deg]
  const eps_rad = (23.439 - 0.0000004 * n) * DEG2RAD;

  const sinLambda = Math.sin(lambda_rad);
  const x = Math.cos(lambda_rad);
  const y = Math.cos(eps_rad) * sinLambda;
  const z = Math.sin(eps_rad) * sinLambda;

  return {
    eciUnit: { x, y, z },
    declination_deg: Math.asin(z) * RAD2DEG,
    rightAscension_deg: (Math.atan2(y, x) * RAD2DEG + 360) % 360,
  };
}

/** 태양 직하점(태양이 천정에 오는 지점) [deg] */
export function subsolarPoint(atMs: number): { lat_deg: number; lon_deg: number } {
  const sun = sunPosition(atMs);
  const gmst_deg = gstime(new Date(atMs)) * RAD2DEG;
  return {
    lat_deg: sun.declination_deg,
    lon_deg: normalizeLonDeg(sun.rightAscension_deg - gmst_deg),
  };
}

/** 직하점의 대척점(밤 반구 중심) [deg] */
export function antisolarPoint(atMs: number): { lat_deg: number; lon_deg: number } {
  const sub = subsolarPoint(atMs);
  return {
    lat_deg: -sub.lat_deg,
    lon_deg: normalizeLonDeg(sub.lon_deg + 180),
  };
}

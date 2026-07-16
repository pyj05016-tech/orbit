/**
 * 좌표 변환 유틸.
 *
 * 변환 순서 규약(그라운드트랙):
 *   satellite.gstime(date) → eciToEcf(posEci, gmst) → eciToGeodetic → degrees
 * 입력 ECI는 TEME [km], 출력 측지좌표는 deg / km.
 */
import * as satellite from 'satellite.js';
import { RAD2DEG, DEG2RAD } from './constants';
import type { GeodeticPos, LookAngles } from '../types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** GMST [rad] — UTC ms epoch 입력 */
export function gmstAt(atMs: number): number {
  return satellite.gstime(new Date(atMs));
}

/** ECI [km] → ECEF [km]. gmst_rad: 그리니치 평균항성시 [rad] */
export function eciToEcf(posEci: Vec3, gmst_rad: number): Vec3 {
  const ecf = satellite.eciToEcf(posEci as satellite.EciVec3<number>, gmst_rad);
  return { x: ecf.x, y: ecf.y, z: ecf.z };
}

/** 경도를 [-180, 180)로 정규화 [deg] */
export function normalizeLonDeg(lon_deg: number): number {
  let lon = lon_deg % 360;
  if (lon >= 180) lon -= 360;
  if (lon < -180) lon += 360;
  return lon;
}

/**
 * ECI [km] → 측지좌표.
 * @param atMs GMST 계산용 UTC ms
 */
export function eciToGeodetic(posEci: Vec3, atMs: number): GeodeticPos {
  const gmst = gmstAt(atMs);
  const gd = satellite.eciToGeodetic(posEci as satellite.EciVec3<number>, gmst);
  return {
    lat_deg: satellite.degreesLat(gd.latitude),
    lon_deg: normalizeLonDeg(satellite.degreesLong(gd.longitude)),
    height_km: gd.height,
  };
}

export interface ObserverGeodetic {
  lat_deg: number;
  lon_deg: number;
  alt_m: number;
}

/** satellite.js observerGd (라디안/km) 생성 */
export function toObserverGd(obs: ObserverGeodetic): satellite.GeodeticLocation {
  return {
    latitude: obs.lat_deg * DEG2RAD,
    longitude: obs.lon_deg * DEG2RAD,
    height: obs.alt_m / 1000,
  };
}

/**
 * 지상국 기준 위성 look angles.
 * posEci [km] + 시각 → az/el/range (deg/km).
 */
export function eciToLookAngles(
  obs: ObserverGeodetic,
  posEci: Vec3,
  atMs: number,
): LookAngles {
  const gmst = gmstAt(atMs);
  const ecf = satellite.eciToEcf(posEci as satellite.EciVec3<number>, gmst);
  const la = satellite.ecfToLookAngles(toObserverGd(obs), ecf);
  let az_deg = la.azimuth * RAD2DEG;
  if (az_deg < 0) az_deg += 360;
  return {
    azimuth_deg: az_deg % 360,
    elevation_deg: la.elevation * RAD2DEG,
    range_km: la.rangeSat,
  };
}

/** 측지좌표 [deg, m] → ECEF [km] (구면 근사 아님 — satellite.js geodeticToEcf 사용) */
export function geodeticToEcf(lat_deg: number, lon_deg: number, alt_m: number): Vec3 {
  const ecf = satellite.geodeticToEcf({
    latitude: lat_deg * DEG2RAD,
    longitude: lon_deg * DEG2RAD,
    height: alt_m / 1000,
  });
  return { x: ecf.x, y: ecf.y, z: ecf.z };
}

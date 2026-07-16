/**
 * AOS/LOS 패스 계산.
 *
 * 알고리즘:
 *  1) coarse step(기본 90s)으로 elevation - minElevation의 부호 변화를 스캔
 *  2) 부호가 바뀌는 구간을 이분법(tol 1s)으로 정밀화 → AOS/LOS
 *  3) 구간 내부를 미세 샘플링해 최대앙각(TCA)과 AOS/LOS 방위각 산출
 *
 * 모든 시각은 UTC ms. 전파 실패 시각은 "지평선 아래"로 간주한다.
 */
import type { OrbitSource, Pass } from '../types';
import { propagate } from './propagator';
import { eciToLookAngles, type ObserverGeodetic } from './coordinates';
import { PASS_BISECTION_TOL_MS, PASS_COARSE_STEP_S, MS_PER_SEC } from './constants';

export interface PassObserver extends ObserverGeodetic {
  minElevation_deg: number;
}

/** 해당 시각의 elevation - minElevation [deg]. 전파 실패 시 큰 음수. */
function elevationAbove(
  source: OrbitSource,
  obs: PassObserver,
  atMs: number,
): number {
  const sv = propagate(source, atMs);
  if (!sv) return -90;
  const la = eciToLookAngles(obs, sv.positionEci, atMs);
  return la.elevation_deg - obs.minElevation_deg;
}

/**
 * f(t) = elevation - minEl 의 부호가 [t0, t1]에서 바뀔 때, 근을 이분법으로 찾는다.
 * @returns 교차 시각 [ms] (tol = PASS_BISECTION_TOL_MS)
 */
function bisectCrossing(
  source: OrbitSource,
  obs: PassObserver,
  t0Ms: number,
  t1Ms: number,
  f0: number,
): number {
  let lo = t0Ms;
  let hi = t1Ms;
  let fLo = f0;
  while (hi - lo > PASS_BISECTION_TOL_MS) {
    const mid = (lo + hi) / 2;
    const fMid = elevationAbove(source, obs, mid);
    if ((fLo <= 0 && fMid <= 0) || (fLo > 0 && fMid > 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2);
}

/** [aos, los] 내부를 샘플링해 TCA/최대앙각 산출 (샘플 간격 5s + 국소 미세화) */
function findMaxElevation(
  source: OrbitSource,
  obs: PassObserver,
  aosMs: number,
  losMs: number,
): { tcaMs: number; maxElevation_deg: number } {
  const stepMs = 5 * MS_PER_SEC;
  let bestT = aosMs;
  let bestEl = -90;
  for (let t = aosMs; t <= losMs; t += stepMs) {
    const el = elevationAbove(source, obs, t) + obs.minElevation_deg;
    if (el > bestEl) {
      bestEl = el;
      bestT = t;
    }
  }
  // 최댓값 주변 1초 간격 미세화
  for (let t = bestT - stepMs; t <= bestT + stepMs; t += MS_PER_SEC) {
    if (t < aosMs || t > losMs) continue;
    const el = elevationAbove(source, obs, t) + obs.minElevation_deg;
    if (el > bestEl) {
      bestEl = el;
      bestT = t;
    }
  }
  return { tcaMs: bestT, maxElevation_deg: bestEl };
}

function azimuthAt(source: OrbitSource, obs: PassObserver, atMs: number): number {
  const sv = propagate(source, atMs);
  if (!sv) return 0;
  return eciToLookAngles(obs, sv.positionEci, atMs).azimuth_deg;
}

/**
 * [startUtcMs, endUtcMs] 사이의 모든 패스 계산.
 * 창 시작 시 이미 가시 상태면 AOS = startUtcMs 로 절단,
 * 창 끝에서 아직 가시 상태면 LOS = endUtcMs 로 절단한다.
 */
export function computePasses(
  source: OrbitSource,
  obs: PassObserver,
  startUtcMs: number,
  endUtcMs: number,
  satelliteId = '',
  groundStationId = '',
): Pass[] {
  const passes: Pass[] = [];
  const coarseMs = PASS_COARSE_STEP_S * MS_PER_SEC;

  let tPrev = startUtcMs;
  let fPrev = elevationAbove(source, obs, tPrev);
  let aosMs: number | null = fPrev > 0 ? startUtcMs : null;

  for (let t = startUtcMs + coarseMs; t <= endUtcMs + coarseMs; t += coarseMs) {
    const tClamped = Math.min(t, endUtcMs);
    const f = elevationAbove(source, obs, tClamped);

    if (fPrev <= 0 && f > 0) {
      aosMs = bisectCrossing(source, obs, tPrev, tClamped, fPrev);
    } else if (fPrev > 0 && f <= 0 && aosMs !== null) {
      const losMs = bisectCrossing(source, obs, tPrev, tClamped, fPrev);
      passes.push(buildPass(source, obs, aosMs, losMs, satelliteId, groundStationId));
      aosMs = null;
    }

    tPrev = tClamped;
    fPrev = f;
    if (tClamped >= endUtcMs) break;
  }

  // 창 끝에서 진행 중인 패스 절단
  if (aosMs !== null && fPrev > 0) {
    passes.push(buildPass(source, obs, aosMs, endUtcMs, satelliteId, groundStationId));
  }

  return passes;
}

function buildPass(
  source: OrbitSource,
  obs: PassObserver,
  aosMs: number,
  losMs: number,
  satelliteId: string,
  groundStationId: string,
): Pass {
  const { tcaMs, maxElevation_deg } = findMaxElevation(source, obs, aosMs, losMs);
  return {
    satelliteId,
    groundStationId,
    aosMs,
    losMs,
    tcaMs,
    maxElevation_deg,
    aosAzimuth_deg: azimuthAt(source, obs, aosMs),
    losAzimuth_deg: azimuthAt(source, obs, losMs),
  };
}

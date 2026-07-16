/**
 * 그라운드트랙 계산 + ±180° 경계(antimeridian) 분할.
 * 점 형식: [lon_deg, lat_deg] (d3-geo 관례).
 */
import type { OrbitSource } from '../types';
import { propagate } from './propagator';
import { eciToGeodetic } from './coordinates';
import {
  GROUNDTRACK_HALF_WINDOW_MIN,
  GROUNDTRACK_STEP_S,
  MS_PER_MIN,
  MS_PER_SEC,
} from './constants';

export type LonLat = [number, number];

/**
 * 연속 두 점의 경도 차가 180°를 넘으면(날짜변경선 통과) 폴리라인을 분할한다.
 * 분할하지 않으면 지도를 가로지르는 가짜 직선이 생긴다.
 */
export function splitAtAntimeridian(pts: LonLat[]): LonLat[][] {
  const segs: LonLat[][] = [];
  let cur: LonLat[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && Math.abs(pts[i][0] - pts[i - 1][0]) > 180) {
      if (cur.length) segs.push(cur);
      cur = [];
    }
    cur.push(pts[i]);
  }
  if (cur.length) segs.push(cur);
  return segs;
}

export interface GroundTrack {
  /** 분할된 트랙 세그먼트들 */
  segments: LonLat[][];
  /** 샘플 원본 (시간 순) */
  points: LonLat[];
}

/**
 * centerMs 기준 ±GROUNDTRACK_HALF_WINDOW_MIN 분 창의 그라운드트랙.
 * 전파 실패 샘플은 건너뛴다(그 지점에서 세그먼트가 자연히 끊긴다).
 */
export function computeGroundTrack(
  source: OrbitSource,
  centerMs: number,
  halfWindowMin = GROUNDTRACK_HALF_WINDOW_MIN,
  stepS = GROUNDTRACK_STEP_S,
): GroundTrack {
  const startMs = centerMs - halfWindowMin * MS_PER_MIN;
  const endMs = centerMs + halfWindowMin * MS_PER_MIN;
  const stepMs = stepS * MS_PER_SEC;

  const points: LonLat[] = [];
  for (let t = startMs; t <= endMs; t += stepMs) {
    const sv = propagate(source, t);
    if (!sv) continue;
    const gd = eciToGeodetic(sv.positionEci, t);
    points.push([gd.lon_deg, gd.lat_deg]);
  }
  return { segments: splitAtAntimeridian(points), points };
}

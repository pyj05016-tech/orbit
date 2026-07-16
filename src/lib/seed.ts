/**
 * 첫 실행 시드 데이터 — ISS(ZARYA) TLE + 서울 지상국.
 * TLE는 형식·체크섬이 검증된 값이어야 한다 (scripts/verify-tle 참조).
 */
import type { GroundStation, Satellite } from '../types';

/** ISS (ZARYA) — epoch 2026-07-16 부근으로 구성한 대표 TLE */
export const ISS_TLE_LINE1 =
  '1 25544U 98067A   26197.50000000  .00016717  00000+0  30328-3 0  9990';
export const ISS_TLE_LINE2 =
  '2 25544  51.6400 208.9163 0006317  69.9862 254.3157 15.49814641123459';

export const SEED_SATELLITES: Satellite[] = [
  {
    id: 'seed-iss',
    name: 'ISS (ZARYA)',
    color: '#22d3ee',
    visible: true,
    source: { kind: 'tle', line1: ISS_TLE_LINE1, line2: ISS_TLE_LINE2 },
  },
];

export const SEED_GROUND_STATIONS: GroundStation[] = [
  {
    id: 'seed-seoul',
    name: 'Seoul',
    lat_deg: 37.5665,
    lon_deg: 126.978,
    alt_m: 50,
    minElevation_deg: 10,
    color: '#f472b6',
    visible: true,
  },
];

export const SATELLITE_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#f97316',
  '#4ade80',
];

export const STATION_COLORS = ['#f472b6', '#facc15', '#2dd4bf', '#c084fc', '#fb923c'];

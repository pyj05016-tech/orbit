/**
 * 공통 도메인 타입.
 *
 * 단위 규약: 모든 변수는 접미사로 단위를 명시한다.
 *   _deg (도), _rad (라디안), _km, _m, _s, Ms(밀리초 epoch)
 * 시각 규약: 내부 연산은 전부 UTC 기준 ms epoch(number)로 통일하고,
 *   Date 변환은 전파/표시 경계에서만 수행한다.
 */

/** 궤도 소스 — TLE 또는 케플러 요소. structured-clone/JSON 직렬화가 안전하도록
 *  케플러 epoch은 Date가 아닌 UTC ms(number)로 보관한다. */
export type OrbitSource =
  | { kind: 'tle'; line1: string; line2: string }
  | {
      kind: 'kepler';
      /** 장반경 [km] */
      a_km: number;
      /** 이심률 [-] (0 <= e < 1) */
      e: number;
      /** 경사각 [deg] */
      i_deg: number;
      /** 승교점 적경 [deg] */
      raan_deg: number;
      /** 근지점 인수 [deg] */
      argp_deg: number;
      /** epoch에서의 평균근점이각 [deg] */
      m0_deg: number;
      /** 요소 기준 시각 [UTC ms epoch] */
      epochMs: number;
    };

/** ECI(TEME) 상태벡터. 위치 [km], 속도 [km/s] */
export interface StateVector {
  positionEci: { x: number; y: number; z: number };
  velocityEci: { x: number; y: number; z: number };
}

/** 측지 좌표 (WGS-72/84 근사) */
export interface GeodeticPos {
  lat_deg: number;
  lon_deg: number; // [-180, 180]
  height_km: number;
}

export interface LookAngles {
  azimuth_deg: number; // 북쪽 기준 시계방향 [0, 360)
  elevation_deg: number;
  range_km: number;
}

export interface Satellite {
  id: string;
  name: string;
  color: string; // hex, 예: '#22d3ee'
  visible: boolean;
  source: OrbitSource;
}

export interface GroundStation {
  id: string;
  name: string;
  lat_deg: number;
  lon_deg: number;
  alt_m: number;
  minElevation_deg: number;
  color: string;
  visible: boolean;
}

/** 하나의 가시 패스 (AOS → LOS) */
export interface Pass {
  satelliteId: string;
  groundStationId: string;
  aosMs: number;
  losMs: number;
  /** 최대앙각 시각 (Time of Closest Approach) */
  tcaMs: number;
  maxElevation_deg: number;
  aosAzimuth_deg: number;
  losAzimuth_deg: number;
}

/** Web Worker 요청/응답 프로토콜 */
export interface PassJob {
  satelliteId: string;
  groundStationId: string;
  source: OrbitSource;
  observer: {
    lat_deg: number;
    lon_deg: number;
    alt_m: number;
    minElevation_deg: number;
  };
}

export interface PassRequest {
  requestId: number;
  jobs: PassJob[];
  startUtcMs: number;
  endUtcMs: number;
}

export interface PassResponse {
  requestId: number;
  passes: Pass[];
}

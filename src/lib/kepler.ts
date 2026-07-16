/**
 * 2체(Two-body) 케플러 궤도 전파기.
 *
 * 좌표계: 결과는 ECI(관성계, TEME 근사) 기준.
 * 단위: 길이 km, 속도 km/s, 각도는 함수 시그니처에 명시(_rad / _deg).
 * 섭동(J2, 대기항력 등)은 고려하지 않는다.
 */
import { DEG2RAD, MU_EARTH_KM3_S2, MS_PER_SEC } from './constants';
import type { OrbitSource, StateVector } from '../types';

export type KeplerSource = Extract<OrbitSource, { kind: 'kepler' }>;

/** 평균 운동 n [rad/s]. a_km: 장반경 [km] */
export function meanMotionRadPerSec(a_km: number): number {
  return Math.sqrt(MU_EARTH_KM3_S2 / (a_km * a_km * a_km));
}

/** 궤도 주기 [s] */
export function orbitalPeriodSecFromA(a_km: number): number {
  return (2 * Math.PI) / meanMotionRadPerSec(a_km);
}

/**
 * 케플러 방정식 M = E - e·sin(E) 를 Newton-Raphson으로 푼다.
 * @param m_rad 평균근점이각 [rad] (임의 범위 허용)
 * @param e 이심률 [-], 0 <= e < 1
 * @returns 이심근점이각 E [rad]
 * @throws 수렴 실패 시 Error
 */
export function solveKepler(
  m_rad: number,
  e: number,
  tol = 1e-10,
  maxIter = 50,
): number {
  // M을 [-π, π]로 정규화하면 초기값 안정성이 좋아진다.
  const twoPi = 2 * Math.PI;
  let m = m_rad % twoPi;
  if (m > Math.PI) m -= twoPi;
  if (m < -Math.PI) m += twoPi;

  // 고이심률에서는 E0 = π 근처가 안전한 초기값.
  let E = e < 0.8 ? m : Math.PI * Math.sign(m || 1);

  for (let iter = 0; iter < maxIter; iter++) {
    const f = E - e * Math.sin(E) - m;
    const fPrime = 1 - e * Math.cos(E);
    const dE = f / fPrime;
    E -= dE;
    if (Math.abs(dE) < tol) {
      // 원래 M이 있던 회전수만큼 되돌린다.
      return E + (m_rad - m);
    }
  }
  throw new Error(`solveKepler: Newton-Raphson이 ${maxIter}회 내에 수렴하지 않음 (M=${m_rad}, e=${e})`);
}

/**
 * 케플러 요소 → ECI 상태벡터.
 * PQW(perifocal) 좌표를 3-1-3 회전(R3(-Ω)·R1(-i)·R3(-ω))으로 ECI 변환.
 * @param el 케플러 요소 (epochMs: UTC ms)
 * @param atMs 전파 목표 시각 [UTC ms]
 */
export function keplerToEci(el: KeplerSource, atMs: number): StateVector {
  const { a_km, e } = el;
  const i_rad = el.i_deg * DEG2RAD;
  const raan_rad = el.raan_deg * DEG2RAD;
  const argp_rad = el.argp_deg * DEG2RAD;
  const m0_rad = el.m0_deg * DEG2RAD;

  const n_radPerSec = meanMotionRadPerSec(a_km);
  const dt_s = (atMs - el.epochMs) / MS_PER_SEC;
  const m_rad = m0_rad + n_radPerSec * dt_s;

  const E_rad = solveKepler(m_rad, e);

  // 진근점이각 ν
  const cosE = Math.cos(E_rad);
  const sinE = Math.sin(E_rad);
  const nu_rad = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);

  // 궤도 반경, 반통경
  const r_km = a_km * (1 - e * cosE);
  const p_km = a_km * (1 - e * e);

  // PQW 좌표
  const cosNu = Math.cos(nu_rad);
  const sinNu = Math.sin(nu_rad);
  const rPqw = { x: r_km * cosNu, y: r_km * sinNu, z: 0 };
  const vScale = Math.sqrt(MU_EARTH_KM3_S2 / p_km);
  const vPqw = { x: -vScale * sinNu, y: vScale * (e + cosNu), z: 0 };

  // 3-1-3 회전: PQW → ECI
  const cosO = Math.cos(raan_rad);
  const sinO = Math.sin(raan_rad);
  const cosI = Math.cos(i_rad);
  const sinI = Math.sin(i_rad);
  const cosW = Math.cos(argp_rad);
  const sinW = Math.sin(argp_rad);

  // 회전행렬 R = R3(-Ω)·R1(-i)·R3(-ω)
  const r11 = cosO * cosW - sinO * sinW * cosI;
  const r12 = -cosO * sinW - sinO * cosW * cosI;
  const r21 = sinO * cosW + cosO * sinW * cosI;
  const r22 = -sinO * sinW + cosO * cosW * cosI;
  const r31 = sinW * sinI;
  const r32 = cosW * sinI;

  const toEci = (p: { x: number; y: number }) => ({
    x: r11 * p.x + r12 * p.y,
    y: r21 * p.x + r22 * p.y,
    z: r31 * p.x + r32 * p.y,
  });

  return {
    positionEci: toEci(rPqw),
    velocityEci: toEci(vPqw),
  };
}

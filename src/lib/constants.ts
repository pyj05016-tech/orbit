/** 물리/렌더링 공용 상수 */

/** 지구 중력 상수 μ [km^3/s^2] (WGS-84) */
export const MU_EARTH_KM3_S2 = 398600.4418;

/** 지구 평균 반경 [km] — 3D 구체 렌더링용 */
export const EARTH_RADIUS_KM = 6371;

/** 지구 적도 반경 [km] (WGS-84) */
export const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;

/** J2 섭동 계수 [-] (참고용 — 2체 전파기는 미사용) */
export const J2 = 1.08262668e-3;

/** three.js 씬 스케일: 1 scene unit = 1000 km */
export const KM_PER_SCENE_UNIT = 1000;
export const SCENE_UNITS_PER_KM = 1 / KM_PER_SCENE_UNIT;

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export const SEC_PER_MIN = 60;
export const MS_PER_SEC = 1000;
export const MS_PER_MIN = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** SGP4/2체 전파 신뢰 한계 — epoch에서 이 이상 벗어나면 경고 */
export const EPOCH_WARN_LIMIT_MS = 7 * MS_PER_DAY;

/** 패스 탐색 coarse step [s] */
export const PASS_COARSE_STEP_S = 90;
/** AOS/LOS 이분법 허용오차 [ms] */
export const PASS_BISECTION_TOL_MS = 1000;

/** 궤도 라인 샘플 수 (1주기당) */
export const ORBIT_LINE_SAMPLES = 360;

/** 그라운드트랙 표시 창 [min] — 현재 시각 기준 ±45분 */
export const GROUNDTRACK_HALF_WINDOW_MIN = 45;
/** 그라운드트랙 샘플 간격 [s] */
export const GROUNDTRACK_STEP_S = 30;

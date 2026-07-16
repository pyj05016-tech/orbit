# SatOps — 위성 관제 웹 대시보드

TLE 또는 케플러 궤도요소를 입력받아 브라우저에서 궤도를 전파하고,
**3D 지구 궤도 뷰 / 2D 그라운드트랙 / 지상국 AOS-LOS 패스 타임라인**을 제공하는 SPA.
백엔드 없음 — 모든 계산은 브라우저(+Web Worker)에서 수행, 목록은 localStorage에 영속화.

## 실행

```bash
npm i
npm run dev     # http://localhost:5173
npm test        # Vitest (28 tests)
npm run build   # tsc --noEmit + vite build
```

첫 실행 시 ISS(ZARYA) TLE와 서울 지상국(37.5665°N, 126.9780°E, 50m, 최소앙각 10°)이
시드로 등록되어 즉시 동작을 확인할 수 있다.

## 기술 스택

TypeScript 5 (strict) · React 18 + Vite · Zustand(persist) · satellite.js(SGP4/SDP4)
· three.js r169 + OrbitControls · d3-geo + world-atlas · Tailwind CSS · Vitest + RTL

## 구조

```
src/
  components/   # Sidebar, SatelliteForm, GroundStationForm, TimeControls, EpochWarningBanner
  views/        # Globe3D, GroundTrack2D, PassTimeline
  lib/
    constants.ts       # MU_EARTH, EARTH_RADIUS_KM, 씬 스케일(1 unit = 1000 km) 등
    propagator.ts      # TLE + 케플러 통합 인터페이스 (propagate / orbitalPeriodSec / validateTle)
    kepler.ts          # 2체 전파기 (Newton-Raphson tol 1e-10, PQW → 3-1-3 회전 → ECI)
    coordinates.ts     # gstime → eciToEcf → eciToGeodetic → degrees, look angles
    passes.ts          # 90s coarse 스캔 + 이분법(tol 1s) AOS/LOS, TCA/최대앙각
    passes.worker.ts   # 패스 계산 Web Worker (PassRequest → PassResponse)
    groundtrack.ts     # ±45분 트랙 + antimeridian(±180°) 분할
    sun.ts             # 저정밀 태양 역서 — 직하점/대일점, 낮/밤 터미네이터용
    earthTexture.ts    # world-atlas를 d3-geo로 캔버스에 그려 지구 텍스처 생성(외부 이미지 無)
    seed.ts            # ISS TLE + 서울 지상국 시드 (scripts/verify-tle.mjs로 체크섬 검증)
  store/        # satellites / groundStations / timeControl 슬라이스
  types/        # Satellite, GroundStation, Pass, OrbitSource, Worker 프로토콜
```

## 설계 노트

- **단위/시각 규약**: 모든 변수는 `_deg`/`_rad`/`_km`/`_m`/`Ms` 접미사로 단위 명시.
  내부 시각은 전부 UTC ms epoch(number)로 통일하고 Date는 전파/표시 경계에서만 생성.
- **OrbitSource의 케플러 epoch은 `epochMs: number`** — Date 객체 대신 숫자를 쓰면
  localStorage JSON 직렬화와 Worker structured-clone에서 타임존/역직렬화 오염이 원천 차단된다.
  (폼에서는 ISO UTC 문자열로 입출력)
- **3D 좌표 매핑**: ECI(z-up) → three.js(y-up)는 `(x, y, z) → (x, z, -y)` (행렬식 +1).
  지구 메시는 GMST만큼 Y축 회전, 지상국은 지구 그룹의 자식(ECEF 고정).
- **궤도 라인 캐싱**: TLE/요소·색상이 바뀔 때만 재계산(1주기 360포인트 샘플).
- **패스 계산**: Web Worker로 오프로드, 계산 중 스피너. 시뮬레이션 시각이 창을
  크게 벗어나면 10분 격자 기준으로 창을 이동해 재계산.
- **SGP4 신뢰 한계**: 표시 위성의 epoch에서 ±7일 초과 시 경고 배너.
- **낮/밤 구역**: 저정밀 태양 역서(Meeus 근사)로 직하점을 구해 2D 지도에는
  대일점 중심 반경 90° 소원(geoCircle)을 밤 반구로 오버레이 + 태양 마커,
  3D 지구는 태양 ECI 방향의 DirectionalLight로 주야 음영을 표현.
- 선택 기능 구현: 3D 지상국-위성 LOS 라인(가시 시에만), 패스 CSV 내보내기.

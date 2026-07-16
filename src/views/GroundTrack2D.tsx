/**
 * 2D 그라운드트랙 (d3-geo equirectangular + world-atlas).
 * 변환 순서: gstime → eciToEcf/eciToGeodetic → degrees (lib/coordinates.ts).
 * ±180° 경계에서 트랙 폴리라인을 분할해 가짜 가로선을 방지한다.
 */
import { useMemo } from 'react';
import { geoEquirectangular, geoPath, geoGraticule10, geoCircle } from 'd3-geo';
import type { GroundStation, Satellite } from '../types';
import { computeGroundTrack, type LonLat } from '../lib/groundtrack';
import { propagate } from '../lib/propagator';
import { eciToGeodetic } from '../lib/coordinates';
import { antisolarPoint, subsolarPoint } from '../lib/sun';
import { getLandFeatures } from '../lib/worldMap';
import { useTimeStore } from '../store/timeControl';
import { MS_PER_SEC } from '../lib/constants';

const W = 1024;
const H = 512;

const projection = geoEquirectangular()
  .scale(W / (2 * Math.PI))
  .translate([W / 2, H / 2]);

function project([lon, lat]: LonLat): [number, number] {
  const p = projection([lon, lat]);
  return p ?? [0, 0];
}

function segmentsToPath(segments: LonLat[][]): string {
  return segments
    .filter((seg) => seg.length >= 2)
    .map(
      (seg) =>
        'M' +
        seg
          .map((pt) => {
            const [x, y] = project(pt);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join('L'),
    )
    .join('');
}

interface Props {
  satellites: Satellite[];
  stations: GroundStation[];
}

export default function GroundTrack2D({ satellites, stations }: Props) {
  const simTimeMs = useTimeStore((s) => s.simTimeMs);
  // 트랙은 10초(시뮬레이션 시간) 단위로만 재계산 — 마커는 매 프레임 갱신
  const quantizedMs = Math.floor(simTimeMs / (10 * MS_PER_SEC)) * (10 * MS_PER_SEC);

  const basePaths = useMemo(() => {
    const land = geoPath(projection)(getLandFeatures()) ?? '';
    const graticule = geoPath(projection)(geoGraticule10()) ?? '';
    return { land, graticule };
  }, []);

  // 낮/밤 구역: 밤 반구 = 대일점(antisolar point) 중심 반경 90° 소원(spherical circle)
  const night = useMemo(() => {
    const anti = antisolarPoint(quantizedMs);
    const sub = subsolarPoint(quantizedMs);
    const nightCircle = geoCircle()
      .center([anti.lon_deg, anti.lat_deg])
      .radius(90)();
    return {
      path: geoPath(projection)(nightCircle) ?? '',
      sunXY: project([sub.lon_deg, sub.lat_deg]),
    };
  }, [quantizedMs]);

  const tracks = useMemo(
    () =>
      satellites.map((sat) => ({
        sat,
        path: segmentsToPath(computeGroundTrack(sat.source, quantizedMs).segments),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [satellites, quantizedMs],
  );

  const markers = satellites
    .map((sat) => {
      const sv = propagate(sat.source, simTimeMs);
      if (!sv) return null;
      const gd = eciToGeodetic(sv.positionEci, simTimeMs);
      const [x, y] = project([gd.lon_deg, gd.lat_deg]);
      return { sat, x, y, gd };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <div className="h-full w-full overflow-hidden" data-testid="groundtrack2d">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <rect width={W} height={H} fill="#0c2340" />
        <path d={basePaths.graticule} fill="none" stroke="#94a3b8" strokeOpacity={0.15} />
        <path
          d={basePaths.land}
          fill="#2f6b4f"
          stroke="#e2e8f0"
          strokeOpacity={0.35}
          strokeWidth={0.6}
        />

        {/* 밤 반구 오버레이 + 태양 직하점 */}
        <path d={night.path} fill="#020617" fillOpacity={0.45} data-testid="night-overlay" />
        <g transform={`translate(${night.sunXY[0]},${night.sunXY[1]})`} data-testid="sun-marker">
          <circle r={7} fill="#fde047" fillOpacity={0.9} />
          <circle r={11} fill="none" stroke="#fde047" strokeOpacity={0.5} />
        </g>

        {tracks.map(({ sat, path }) => (
          <path
            key={sat.id}
            d={path}
            fill="none"
            stroke={sat.color}
            strokeWidth={1.6}
            strokeOpacity={0.85}
          />
        ))}

        {stations.map((gs) => {
          const [x, y] = project([gs.lon_deg, gs.lat_deg]);
          return (
            <g key={gs.id} transform={`translate(${x},${y})`}>
              <path
                d="M0,-8 L6,4 L-6,4 Z"
                fill={gs.color}
                stroke="#0f172a"
                strokeWidth={1}
              />
              <text
                y={18}
                textAnchor="middle"
                fontSize={13}
                fill={gs.color}
                style={{ paintOrder: 'stroke' }}
                stroke="#020617"
                strokeWidth={3}
              >
                {gs.name}
              </text>
            </g>
          );
        })}

        {markers.map(({ sat, x, y, gd }) => (
          <g key={sat.id} transform={`translate(${x},${y})`}>
            <circle r={5.5} fill={sat.color} stroke="#020617" strokeWidth={1.5} />
            <circle r={9} fill="none" stroke={sat.color} strokeOpacity={0.6} />
            <text
              y={-14}
              textAnchor="middle"
              fontSize={13}
              fill={sat.color}
              style={{ paintOrder: 'stroke' }}
              stroke="#020617"
              strokeWidth={3}
            >
              {`${sat.name} (${gd.lat_deg.toFixed(1)}°, ${gd.lon_deg.toFixed(1)}°)`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

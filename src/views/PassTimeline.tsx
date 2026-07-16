/**
 * 패스 타임라인 (간트 차트).
 * 행 = (위성 × 지상국) 쌍, 막대 = AOS→LOS 구간, 색 = 최대앙각 등급,
 * 세로선 = 현재 시뮬레이션 시각(playhead). hover 시 상세 툴팁.
 */
import { useState } from 'react';
import type { GroundStation, Pass, Satellite } from '../types';
import type { PassWindow } from '../hooks/usePasses';
import { MS_PER_HOUR, MS_PER_SEC } from '../lib/constants';
import { useTimeStore } from '../store/timeControl';

const ROW_H = 34;
const HEADER_H = 26;
const LABEL_W = 210;

function elevationColor(maxEl_deg: number): string {
  if (maxEl_deg >= 50) return '#34d399'; // 우수
  if (maxEl_deg >= 25) return '#fbbf24'; // 보통
  return '#fb7185'; // 낮음
}

function fmtUtc(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}

function fmtDur(ms: number): string {
  const totalS = Math.round(ms / MS_PER_SEC);
  return `${Math.floor(totalS / 60)}m ${String(totalS % 60).padStart(2, '0')}s`;
}

export function passesToCsv(
  passes: Pass[],
  satName: (id: string) => string,
  gsName: (id: string) => string,
): string {
  const header =
    'satellite,ground_station,aos_utc,los_utc,tca_utc,duration_s,max_elevation_deg,aos_azimuth_deg,los_azimuth_deg';
  const rows = passes.map((p) =>
    [
      satName(p.satelliteId),
      gsName(p.groundStationId),
      new Date(p.aosMs).toISOString(),
      new Date(p.losMs).toISOString(),
      new Date(p.tcaMs).toISOString(),
      Math.round((p.losMs - p.aosMs) / MS_PER_SEC),
      p.maxElevation_deg.toFixed(1),
      p.aosAzimuth_deg.toFixed(1),
      p.losAzimuth_deg.toFixed(1),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

interface TooltipState {
  pass: Pass;
  x: number;
  y: number;
}

interface Props {
  satellites: Satellite[];
  stations: GroundStation[];
  passes: Pass[];
  loading: boolean;
  window: PassWindow;
  onRecompute: () => void;
}

export default function PassTimeline({
  satellites,
  stations,
  passes,
  loading,
  window: win,
  onRecompute,
}: Props) {
  const simTimeMs = useTimeStore((s) => s.simTimeMs);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const pairs = satellites.flatMap((sat) =>
    stations.map((gs) => ({ sat, gs, key: `${sat.id}|${gs.id}` })),
  );
  const spanMs = win.endUtcMs - win.startUtcMs;
  const chartW = 1000;
  const chartH = HEADER_H + pairs.length * ROW_H;

  const xOf = (ms: number) =>
    ((ms - win.startUtcMs) / spanMs) * chartW;

  const hourTicks: number[] = [];
  const firstHour = Math.ceil(win.startUtcMs / MS_PER_HOUR) * MS_PER_HOUR;
  for (let t = firstHour; t <= win.endUtcMs; t += 2 * MS_PER_HOUR) hourTicks.push(t);

  const satName = (id: string) => satellites.find((s) => s.id === id)?.name ?? id;
  const gsName = (id: string) => stations.find((g) => g.id === id)?.name ?? id;

  const exportCsv = () => {
    const csv = passesToCsv(passes, satName, gsName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passes_${new Date(win.startUtcMs).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex h-full flex-col" data-testid="pass-timeline">
      <div className="flex items-center gap-3 border-b border-slate-800 px-3 py-1.5 text-xs text-slate-400">
        <span className="font-semibold text-slate-200">패스 타임라인 (24h)</span>
        <span>
          {new Date(win.startUtcMs).toISOString().slice(0, 16).replace('T', ' ')} →{' '}
          {new Date(win.endUtcMs).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </span>
        {loading && (
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            계산 중…
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#34d399' }} /> ≥50°
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#fbbf24' }} /> 25–50°
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#fb7185' }} /> &lt;25°
          </span>
          <button
            onClick={onRecompute}
            className="rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
          >
            지금부터 재계산
          </button>
          <button
            onClick={exportCsv}
            disabled={passes.length === 0}
            className="rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-800 disabled:opacity-40"
          >
            CSV
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {pairs.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            표시할 위성·지상국 조합이 없습니다. 사이드바에서 체크하세요.
          </p>
        ) : (
          <div className="flex">
            {/* 행 라벨 */}
            <div className="shrink-0" style={{ width: LABEL_W }}>
              <div style={{ height: HEADER_H }} />
              {pairs.map(({ sat, gs, key }) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 truncate px-2 text-xs text-slate-300"
                  style={{ height: ROW_H }}
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: sat.color }}
                  />
                  <span className="truncate">
                    {sat.name} @ {gs.name}
                  </span>
                </div>
              ))}
            </div>

            {/* 차트 */}
            <div className="min-w-0 flex-1">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full"
                style={{ height: chartH }}
                preserveAspectRatio="none"
                onMouseLeave={() => setTooltip(null)}
              >
                {/* 시간 눈금 */}
                {hourTicks.map((t) => (
                  <g key={t}>
                    <line
                      x1={xOf(t)}
                      x2={xOf(t)}
                      y1={HEADER_H}
                      y2={chartH}
                      stroke="#1e293b"
                    />
                    <text x={xOf(t) + 3} y={HEADER_H - 8} fontSize={11} fill="#64748b">
                      {fmtUtc(t).slice(0, 5)}
                    </text>
                  </g>
                ))}

                {/* 행 구분선 */}
                {pairs.map((_, i) => (
                  <line
                    key={i}
                    x1={0}
                    x2={chartW}
                    y1={HEADER_H + (i + 1) * ROW_H}
                    y2={HEADER_H + (i + 1) * ROW_H}
                    stroke="#0f172a"
                  />
                ))}

                {/* 패스 막대 */}
                {passes.map((p, idx) => {
                  const rowIdx = pairs.findIndex(
                    (pr) => pr.sat.id === p.satelliteId && pr.gs.id === p.groundStationId,
                  );
                  if (rowIdx < 0) return null;
                  const x = xOf(p.aosMs);
                  const w = Math.max(xOf(p.losMs) - x, 2);
                  const y = HEADER_H + rowIdx * ROW_H + 7;
                  return (
                    <rect
                      key={idx}
                      x={x}
                      y={y}
                      width={w}
                      height={ROW_H - 14}
                      rx={3}
                      fill={elevationColor(p.maxElevation_deg)}
                      opacity={0.9}
                      onMouseEnter={(e) => {
                        const host = (e.target as SVGElement).closest(
                          '[data-testid="pass-timeline"]',
                        ) as HTMLElement | null;
                        const rect = host?.getBoundingClientRect();
                        setTooltip({
                          pass: p,
                          x: e.clientX - (rect?.left ?? 0),
                          y: e.clientY - (rect?.top ?? 0),
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}

                {/* playhead */}
                {simTimeMs >= win.startUtcMs && simTimeMs <= win.endUtcMs && (
                  <line
                    x1={xOf(simTimeMs)}
                    x2={xOf(simTimeMs)}
                    y1={0}
                    y2={chartH}
                    stroke="#22d3ee"
                    strokeWidth={1.5}
                  />
                )}
              </svg>
            </div>
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded border border-slate-700 bg-slate-900/95 p-2 text-xs text-slate-200 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, 720),
            top: Math.max(tooltip.y - 90, 4),
          }}
        >
          <div className="font-semibold text-cyan-300">
            {satName(tooltip.pass.satelliteId)} @ {gsName(tooltip.pass.groundStationId)}
          </div>
          <table className="mt-1">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-400">AOS</td>
                <td>
                  {fmtUtc(tooltip.pass.aosMs)} UTC (Az {tooltip.pass.aosAzimuth_deg.toFixed(0)}°)
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-400">LOS</td>
                <td>
                  {fmtUtc(tooltip.pass.losMs)} UTC (Az {tooltip.pass.losAzimuth_deg.toFixed(0)}°)
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-400">지속</td>
                <td>{fmtDur(tooltip.pass.losMs - tooltip.pass.aosMs)}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-400">최대앙각</td>
                <td>
                  {tooltip.pass.maxElevation_deg.toFixed(1)}° (TCA {fmtUtc(tooltip.pass.tcaMs)})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

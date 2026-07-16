/**
 * SGP4/2체 전파 신뢰 한계 경고 — 표시 중인 위성의 epoch에서
 * 시뮬레이션 시각이 ±7일 이상 벗어나면 배너 표시.
 */
import { useMemo } from 'react';
import type { Satellite } from '../types';
import { epochMsOf } from '../lib/propagator';
import { EPOCH_WARN_LIMIT_MS, MS_PER_DAY } from '../lib/constants';
import { useTimeStore } from '../store/timeControl';
import { MS_PER_MIN } from '../lib/constants';

interface Props {
  satellites: Satellite[];
}

export default function EpochWarningBanner({ satellites }: Props) {
  const simTimeMs = useTimeStore((s) => s.simTimeMs);
  // 분 단위로만 재평가
  const quantized = Math.floor(simTimeMs / MS_PER_MIN) * MS_PER_MIN;

  const stale = useMemo(
    () =>
      satellites
        .map((sat) => ({
          sat,
          driftDays: Math.abs(quantized - epochMsOf(sat.source)) / MS_PER_DAY,
        }))
        .filter((x) => x.driftDays * MS_PER_DAY > EPOCH_WARN_LIMIT_MS),
    [satellites, quantized],
  );

  if (stale.length === 0) return null;

  return (
    <div
      className="border-b border-amber-700 bg-amber-950/70 px-3 py-1 text-xs text-amber-300"
      role="status"
    >
      ⚠ epoch에서 7일 이상 벗어나 전파 정확도가 낮습니다:{' '}
      {stale
        .map(({ sat, driftDays }) => `${sat.name} (${driftDays.toFixed(1)}일)`)
        .join(', ')}
    </div>
  );
}

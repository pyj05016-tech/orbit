/**
 * 패스 계산 Web Worker 훅.
 * 표시 중인 (위성 × 지상국) 조합이 바뀌거나 창이 낡으면 재계산한다.
 * 계산 중에는 loading=true (스피너 표시용).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pass, PassRequest, PassResponse } from '../types';
import type { Satellite, GroundStation } from '../types';
import { MS_PER_HOUR, MS_PER_MIN } from '../lib/constants';
import { useTimeStore } from '../store/timeControl';

export interface PassWindow {
  startUtcMs: number;
  endUtcMs: number;
}

export interface UsePassesResult {
  passes: Pass[];
  loading: boolean;
  window: PassWindow;
  recompute: () => void;
}

export function usePasses(
  satellites: Satellite[],
  stations: GroundStation[],
  horizonHours = 24,
): UsePassesResult {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(false);
  const [windowStart, setWindowStart] = useState(() =>
    Math.floor(useTimeStore.getState().simTimeMs / MS_PER_MIN) * MS_PER_MIN,
  );

  // 조합 식별 키 — 이름/색 변경으로는 재계산하지 않는다
  const pairsKey = useMemo(
    () =>
      JSON.stringify([
        satellites.map((s) => [s.id, s.source]),
        stations.map((g) => [g.id, g.lat_deg, g.lon_deg, g.alt_m, g.minElevation_deg]),
        horizonHours,
      ]),
    [satellites, stations, horizonHours],
  );

  useEffect(() => {
    const worker = new Worker(new URL('../lib/passes.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<PassResponse>) => {
      if (e.data.requestId !== requestIdRef.current) return; // 낡은 응답 무시
      setPasses(e.data.passes);
      setLoading(false);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // 시뮬레이션 시각이 창을 벗어나면 창을 앞으로 민다 (10분 단위로만 이동해 재계산 억제)
  useEffect(() => {
    const unsub = useTimeStore.subscribe((s) => {
      setWindowStart((prev) => {
        const drift = s.simTimeMs - prev;
        if (drift < -10 * MS_PER_MIN || drift > 2 * MS_PER_HOUR) {
          return Math.floor(s.simTimeMs / (10 * MS_PER_MIN)) * (10 * MS_PER_MIN);
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    if (satellites.length === 0 || stations.length === 0) {
      setPasses([]);
      setLoading(false);
      return;
    }
    requestIdRef.current += 1;
    const req: PassRequest = {
      requestId: requestIdRef.current,
      jobs: satellites.flatMap((sat) =>
        stations.map((gs) => ({
          satelliteId: sat.id,
          groundStationId: gs.id,
          source: sat.source,
          observer: {
            lat_deg: gs.lat_deg,
            lon_deg: gs.lon_deg,
            alt_m: gs.alt_m,
            minElevation_deg: gs.minElevation_deg,
          },
        })),
      ),
      startUtcMs: windowStart,
      endUtcMs: windowStart + horizonHours * MS_PER_HOUR,
    };
    setLoading(true);
    worker.postMessage(req);
    // pairsKey가 satellites/stations 변경을 대표한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey, windowStart]);

  return {
    passes,
    loading,
    window: { startUtcMs: windowStart, endUtcMs: windowStart + horizonHours * MS_PER_HOUR },
    recompute: () =>
      setWindowStart(
        Math.floor(useTimeStore.getState().simTimeMs / MS_PER_MIN) * MS_PER_MIN,
      ),
  };
}

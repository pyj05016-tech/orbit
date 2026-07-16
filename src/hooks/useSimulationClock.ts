/**
 * requestAnimationFrame 루프로 시뮬레이션 시각을 진행한다.
 * 전파 자체는 각 뷰가 수행하며, 여기서는 시각만 갱신(프레임당 1회).
 * App 최상위에서 딱 한 번 마운트할 것.
 */
import { useEffect } from 'react';
import { useTimeStore } from '../store/timeControl';

export function useSimulationClock(): void {
  useEffect(() => {
    let rafId = 0;
    let lastReal = performance.now();

    const loop = (now: number) => {
      const dtRealMs = Math.min(now - lastReal, 500); // 탭 비활성 복귀 시 점프 방지
      lastReal = now;
      useTimeStore.getState().tick(dtRealMs);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
}

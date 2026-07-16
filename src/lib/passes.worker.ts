/**
 * 패스 계산 Web Worker.
 * 메인 스레드 블로킹을 피하기 위해 (위성 × 지상국) 전 조합을 여기서 계산한다.
 * 프로토콜: PassRequest → PassResponse (types/index.ts 참조)
 */
import type { Pass, PassRequest, PassResponse } from '../types';
import { computePasses } from './passes';

self.onmessage = (e: MessageEvent<PassRequest>) => {
  const { requestId, jobs, startUtcMs, endUtcMs } = e.data;
  const passes: Pass[] = [];
  for (const job of jobs) {
    const result = computePasses(
      job.source,
      {
        lat_deg: job.observer.lat_deg,
        lon_deg: job.observer.lon_deg,
        alt_m: job.observer.alt_m,
        minElevation_deg: job.observer.minElevation_deg,
      },
      startUtcMs,
      endUtcMs,
      job.satelliteId,
      job.groundStationId,
    );
    passes.push(...result);
  }
  const response: PassResponse = { requestId, passes };
  self.postMessage(response);
};

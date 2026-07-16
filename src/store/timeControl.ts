/**
 * 시뮬레이션 시간 슬라이스.
 * simTimeMs: 시뮬레이션 UTC ms. rAF 루프(useSimulationClock)가 tick()으로 진행.
 * 영속화하지 않는다 — 항상 실제 현재 UTC로 시작.
 */
import { create } from 'zustand';

export const SPEED_OPTIONS = [1, 10, 60, 600] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

interface TimeState {
  simTimeMs: number;
  isPlaying: boolean;
  speed: SpeedOption;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: SpeedOption) => void;
  setSimTime: (ms: number) => void;
  resetToNow: () => void;
  /** rAF에서 호출 — 실제 경과시간(dtRealMs)에 배속을 곱해 진행 */
  tick: (dtRealMs: number) => void;
}

export const useTimeStore = create<TimeState>()((set, get) => ({
  simTimeMs: Date.now(),
  isPlaying: true,
  speed: 1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ speed }),
  setSimTime: (ms) => set({ simTimeMs: ms }),
  resetToNow: () => set({ simTimeMs: Date.now() }),

  tick: (dtRealMs) => {
    const { isPlaying, speed, simTimeMs } = get();
    if (!isPlaying) return;
    set({ simTimeMs: simTimeMs + dtRealMs * speed });
  },
}));

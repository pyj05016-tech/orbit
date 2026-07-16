/**
 * 위성 목록 슬라이스 — localStorage 영속화.
 * OrbitSource는 순수 JSON(케플러 epoch은 epochMs number)이라 그대로 직렬화 가능.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrbitSource, Satellite } from '../types';
import { SEED_SATELLITES, SATELLITE_COLORS } from '../lib/seed';

interface SatelliteState {
  satellites: Satellite[];
  addSatellite: (name: string, source: OrbitSource) => void;
  updateSatellite: (id: string, patch: Partial<Omit<Satellite, 'id'>>) => void;
  removeSatellite: (id: string) => void;
  toggleVisible: (id: string) => void;
}

let nextIdCounter = 0;
function newId(prefix: string): string {
  nextIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextIdCounter}`;
}

export const useSatelliteStore = create<SatelliteState>()(
  persist(
    (set, get) => ({
      satellites: SEED_SATELLITES,

      addSatellite: (name, source) =>
        set((s) => ({
          satellites: [
            ...s.satellites,
            {
              id: newId('sat'),
              name,
              color: SATELLITE_COLORS[s.satellites.length % SATELLITE_COLORS.length],
              visible: true,
              source,
            },
          ],
        })),

      updateSatellite: (id, patch) =>
        set((s) => ({
          satellites: s.satellites.map((sat) =>
            sat.id === id ? { ...sat, ...patch } : sat,
          ),
        })),

      removeSatellite: (id) =>
        set((s) => ({ satellites: s.satellites.filter((sat) => sat.id !== id) })),

      toggleVisible: (id) => {
        const sat = get().satellites.find((x) => x.id === id);
        if (sat) get().updateSatellite(id, { visible: !sat.visible });
      },
    }),
    { name: 'satops.satellites.v1' },
  ),
);

/** 표시 대상 위성만 */
export function selectVisibleSatellites(s: SatelliteState): Satellite[] {
  return s.satellites.filter((sat) => sat.visible);
}

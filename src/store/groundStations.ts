/** 지상국 목록 슬라이스 — localStorage 영속화 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GroundStation } from '../types';
import { SEED_GROUND_STATIONS, STATION_COLORS } from '../lib/seed';

interface GroundStationState {
  stations: GroundStation[];
  addStation: (st: Omit<GroundStation, 'id' | 'color' | 'visible'>) => void;
  updateStation: (id: string, patch: Partial<Omit<GroundStation, 'id'>>) => void;
  removeStation: (id: string) => void;
  toggleVisible: (id: string) => void;
}

let nextIdCounter = 0;
function newId(prefix: string): string {
  nextIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextIdCounter}`;
}

export const useGroundStationStore = create<GroundStationState>()(
  persist(
    (set, get) => ({
      stations: SEED_GROUND_STATIONS,

      addStation: (st) =>
        set((s) => ({
          stations: [
            ...s.stations,
            {
              ...st,
              id: newId('gs'),
              color: STATION_COLORS[s.stations.length % STATION_COLORS.length],
              visible: true,
            },
          ],
        })),

      updateStation: (id, patch) =>
        set((s) => ({
          stations: s.stations.map((st) => (st.id === id ? { ...st, ...patch } : st)),
        })),

      removeStation: (id) =>
        set((s) => ({ stations: s.stations.filter((st) => st.id !== id) })),

      toggleVisible: (id) => {
        const st = get().stations.find((x) => x.id === id);
        if (st) get().updateStation(id, { visible: !st.visible });
      },
    }),
    { name: 'satops.groundstations.v1' },
  ),
);

export function selectVisibleStations(s: GroundStationState): GroundStation[] {
  return s.stations.filter((st) => st.visible);
}

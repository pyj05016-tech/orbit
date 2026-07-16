/**
 * 레이아웃: 좌측 사이드바 | 우측(시간 컨트롤 + 3D/2D 분할 + 패스 타임라인)
 */
import Sidebar from './components/Sidebar';
import TimeControls from './components/TimeControls';
import EpochWarningBanner from './components/EpochWarningBanner';
import Globe3D from './views/Globe3D';
import GroundTrack2D from './views/GroundTrack2D';
import PassTimeline from './views/PassTimeline';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationClock } from './hooks/useSimulationClock';
import { usePasses } from './hooks/usePasses';
import { useSatelliteStore, selectVisibleSatellites } from './store/satellites';
import { useGroundStationStore, selectVisibleStations } from './store/groundStations';

export default function App() {
  useSimulationClock();

  const visibleSats = useSatelliteStore(useShallow(selectVisibleSatellites));
  const visibleStations = useGroundStationStore(useShallow(selectVisibleStations));
  const { passes, loading, window: passWindow, recompute } = usePasses(
    visibleSats,
    visibleStations,
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-slate-100">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-panel">
          <TimeControls />
        </header>
        <EpochWarningBanner satellites={visibleSats} />

        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div className="min-h-0 border-r border-slate-800">
            <Globe3D satellites={visibleSats} stations={visibleStations} />
          </div>
          <div className="min-h-0 bg-[#0c2340]">
            <GroundTrack2D satellites={visibleSats} stations={visibleStations} />
          </div>
        </div>

        <div className="h-64 shrink-0 border-t border-slate-800 bg-panel">
          <PassTimeline
            satellites={visibleSats}
            stations={visibleStations}
            passes={passes}
            loading={loading}
            window={passWindow}
            onRecompute={recompute}
          />
        </div>
      </main>
    </div>
  );
}

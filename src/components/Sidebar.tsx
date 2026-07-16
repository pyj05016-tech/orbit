/**
 * 좌측 사이드바 — 위성/지상국 리스트 + 체크박스 + 색상 칩 + 편집/삭제 + 추가 폼.
 */
import { useState } from 'react';
import { useSatelliteStore } from '../store/satellites';
import { useGroundStationStore } from '../store/groundStations';
import SatelliteForm from './SatelliteForm';
import GroundStationForm from './GroundStationForm';

export default function Sidebar() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const { addSatellite, updateSatellite, removeSatellite, toggleVisible } =
    useSatelliteStore.getState();
  const stations = useGroundStationStore((s) => s.stations);
  const gsActions = useGroundStationStore.getState();

  const [satFormOpen, setSatFormOpen] = useState(false);
  const [editingSatId, setEditingSatId] = useState<string | null>(null);
  const [gsFormOpen, setGsFormOpen] = useState(false);
  const [editingGsId, setEditingGsId] = useState<string | null>(null);

  const editingSat = satellites.find((s) => s.id === editingSatId);
  const editingGs = stations.find((g) => g.id === editingGsId);

  const rowCls =
    'group flex items-center gap-2 rounded px-1.5 py-1 text-xs text-slate-200 hover:bg-slate-800';
  const iconBtnCls =
    'invisible rounded px-1 text-slate-400 hover:bg-slate-700 hover:text-white group-hover:visible';

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-800 bg-panel p-3">
      <h1 className="text-sm font-bold tracking-wide text-cyan-300">
        🛰 SatOps 대시보드
      </h1>

      {/* 위성 */}
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            위성 ({satellites.length})
          </h2>
          <button
            onClick={() => {
              setSatFormOpen((v) => !v);
              setEditingSatId(null);
            }}
            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-cyan-300 hover:bg-slate-700"
          >
            {satFormOpen ? '닫기' : '+ 추가'}
          </button>
        </div>

        {satFormOpen && !editingSat && (
          <SatelliteForm
            onSubmit={(name, source) => {
              addSatellite(name, source);
              setSatFormOpen(false);
            }}
            onCancel={() => setSatFormOpen(false)}
          />
        )}

        <ul className="mt-1 space-y-0.5">
          {satellites.map((sat) => (
            <li key={sat.id}>
              <div className={rowCls}>
                <input
                  type="checkbox"
                  checked={sat.visible}
                  onChange={() => toggleVisible(sat.id)}
                  className="accent-cyan-500"
                  aria-label={`${sat.name} 표시`}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: sat.color }}
                />
                <span className="flex-1 truncate" title={sat.name}>
                  {sat.name}
                </span>
                <span className="text-[9px] uppercase text-slate-500">
                  {sat.source.kind}
                </span>
                <button
                  className={iconBtnCls}
                  title="편집"
                  onClick={() => {
                    setEditingSatId(sat.id);
                    setSatFormOpen(false);
                  }}
                >
                  ✎
                </button>
                <button
                  className={iconBtnCls}
                  title="삭제"
                  onClick={() => removeSatellite(sat.id)}
                >
                  ✕
                </button>
              </div>
              {editingSat?.id === sat.id && (
                <SatelliteForm
                  initial={editingSat}
                  onSubmit={(name, source) => {
                    updateSatellite(sat.id, { name, source });
                    setEditingSatId(null);
                  }}
                  onCancel={() => setEditingSatId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 지상국 */}
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            지상국 ({stations.length})
          </h2>
          <button
            onClick={() => {
              setGsFormOpen((v) => !v);
              setEditingGsId(null);
            }}
            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-cyan-300 hover:bg-slate-700"
          >
            {gsFormOpen ? '닫기' : '+ 추가'}
          </button>
        </div>

        {gsFormOpen && !editingGs && (
          <GroundStationForm
            onSubmit={(st) => {
              gsActions.addStation(st);
              setGsFormOpen(false);
            }}
            onCancel={() => setGsFormOpen(false)}
          />
        )}

        <ul className="mt-1 space-y-0.5">
          {stations.map((gs) => (
            <li key={gs.id}>
              <div className={rowCls}>
                <input
                  type="checkbox"
                  checked={gs.visible}
                  onChange={() => gsActions.toggleVisible(gs.id)}
                  className="accent-pink-500"
                  aria-label={`${gs.name} 표시`}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: gs.color }}
                />
                <span className="flex-1 truncate" title={gs.name}>
                  {gs.name}
                </span>
                <span className="text-[9px] text-slate-500">
                  {gs.lat_deg.toFixed(1)}°, {gs.lon_deg.toFixed(1)}°
                </span>
                <button
                  className={iconBtnCls}
                  title="편집"
                  onClick={() => {
                    setEditingGsId(gs.id);
                    setGsFormOpen(false);
                  }}
                >
                  ✎
                </button>
                <button
                  className={iconBtnCls}
                  title="삭제"
                  onClick={() => gsActions.removeStation(gs.id)}
                >
                  ✕
                </button>
              </div>
              {editingGs?.id === gs.id && (
                <GroundStationForm
                  initial={editingGs}
                  onSubmit={(st) => {
                    gsActions.updateStation(gs.id, st);
                    setEditingGsId(null);
                  }}
                  onCancel={() => setEditingGsId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-auto text-[10px] leading-relaxed text-slate-600">
        모든 궤도 계산은 브라우저에서 수행됩니다 (SGP4 + 2체 전파).
        목록은 localStorage에 저장됩니다.
      </p>
    </aside>
  );
}

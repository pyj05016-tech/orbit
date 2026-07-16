/** 지상국 추가/편집 폼 */
import { useState } from 'react';
import type { GroundStation } from '../types';

interface Props {
  initial?: GroundStation;
  onSubmit: (st: {
    name: string;
    lat_deg: number;
    lon_deg: number;
    alt_m: number;
    minElevation_deg: number;
  }) => void;
  onCancel: () => void;
}

export default function GroundStationForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lat, setLat] = useState(String(initial?.lat_deg ?? ''));
  const [lon, setLon] = useState(String(initial?.lon_deg ?? ''));
  const [alt, setAlt] = useState(String(initial?.alt_m ?? '0'));
  const [minEl, setMinEl] = useState(String(initial?.minElevation_deg ?? '10'));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) {
      setError('지상국 이름을 입력하세요');
      return;
    }
    const lat_deg = Number(lat);
    const lon_deg = Number(lon);
    const alt_m = Number(alt);
    const minElevation_deg = Number(minEl);
    if (!Number.isFinite(lat_deg) || lat_deg < -90 || lat_deg > 90) {
      setError('위도는 -90 ~ 90 범위여야 합니다');
      return;
    }
    if (!Number.isFinite(lon_deg) || lon_deg < -180 || lon_deg > 180) {
      setError('경도는 -180 ~ 180 범위여야 합니다');
      return;
    }
    if (!Number.isFinite(alt_m)) {
      setError('고도가 숫자가 아닙니다');
      return;
    }
    if (!Number.isFinite(minElevation_deg) || minElevation_deg < 0 || minElevation_deg >= 90) {
      setError('최소앙각은 0 ~ 90 범위여야 합니다');
      return;
    }
    onSubmit({ name: name.trim(), lat_deg, lon_deg, alt_m, minElevation_deg });
  };

  const inputCls =
    'w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none';
  const labelCls = 'mb-0.5 block text-[10px] uppercase tracking-wide text-slate-400';

  return (
    <div className="space-y-2 rounded border border-slate-700 bg-slate-800/60 p-2.5">
      <div>
        <label className={labelCls}>이름</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: Seoul"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>위도 [deg]</label>
          <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>경도 [deg]</label>
          <input className={inputCls} value={lon} onChange={(e) => setLon(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>고도 [m]</label>
          <input className={inputCls} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>최소앙각 [deg]</label>
          <input className={inputCls} value={minEl} onChange={(e) => setMinEl(e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="rounded bg-rose-950/60 px-2 py-1 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 rounded bg-cyan-600 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
        >
          {initial ? '저장' : '추가'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded border border-slate-600 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          취소
        </button>
      </div>
    </div>
  );
}

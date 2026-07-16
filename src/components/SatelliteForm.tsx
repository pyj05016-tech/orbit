/**
 * 위성 추가/편집 폼 — TLE 모드 / 케플러 모드 탭.
 * TLE: 형식·체크섬·SGP4 초기화 검증 후 저장. 실패 시 인라인 에러.
 * 케플러: a(km) 또는 고도(km) 입력, epoch은 ISO UTC 문자열.
 */
import { useState } from 'react';
import type { OrbitSource, Satellite } from '../types';
import { validateTle } from '../lib/propagator';
import { EARTH_EQUATORIAL_RADIUS_KM } from '../lib/constants';

type Mode = 'tle' | 'kepler';

interface Props {
  initial?: Satellite;
  onSubmit: (name: string, source: OrbitSource) => void;
  onCancel: () => void;
}

interface KeplerDraft {
  aMode: 'a' | 'alt';
  aOrAlt: string;
  e: string;
  i_deg: string;
  raan_deg: string;
  argp_deg: string;
  m0_deg: string;
  epochIso: string;
}

function defaultKeplerDraft(src?: OrbitSource): KeplerDraft {
  if (src?.kind === 'kepler') {
    return {
      aMode: 'a',
      aOrAlt: String(src.a_km),
      e: String(src.e),
      i_deg: String(src.i_deg),
      raan_deg: String(src.raan_deg),
      argp_deg: String(src.argp_deg),
      m0_deg: String(src.m0_deg),
      epochIso: new Date(src.epochMs).toISOString(),
    };
  }
  return {
    aMode: 'alt',
    aOrAlt: '550',
    e: '0.001',
    i_deg: '97.6',
    raan_deg: '0',
    argp_deg: '0',
    m0_deg: '0',
    epochIso: new Date().toISOString(),
  };
}

export default function SatelliteForm({ initial, onSubmit, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>(initial?.source.kind ?? 'tle');
  const [name, setName] = useState(initial?.name ?? '');
  const [line1, setLine1] = useState(
    initial?.source.kind === 'tle' ? initial.source.line1 : '',
  );
  const [line2, setLine2] = useState(
    initial?.source.kind === 'tle' ? initial.source.line2 : '',
  );
  const [kep, setKep] = useState<KeplerDraft>(() => defaultKeplerDraft(initial?.source));
  const [error, setError] = useState<string | null>(null);

  const setK = (patch: Partial<KeplerDraft>) => setKep((k) => ({ ...k, ...patch }));

  const submit = () => {
    if (!name.trim()) {
      setError('위성 이름을 입력하세요');
      return;
    }
    if (mode === 'tle') {
      const l1 = line1.trim();
      const l2 = line2.trim();
      const err = validateTle(l1, l2);
      if (err) {
        setError(`TLE 오류: ${err}`);
        return;
      }
      onSubmit(name.trim(), { kind: 'tle', line1: l1, line2: l2 });
      return;
    }

    // 케플러 검증
    const nums = {
      aOrAlt: Number(kep.aOrAlt),
      e: Number(kep.e),
      i_deg: Number(kep.i_deg),
      raan_deg: Number(kep.raan_deg),
      argp_deg: Number(kep.argp_deg),
      m0_deg: Number(kep.m0_deg),
    };
    for (const [k, v] of Object.entries(nums)) {
      if (!Number.isFinite(v)) {
        setError(`숫자가 아닌 값: ${k}`);
        return;
      }
    }
    const a_km =
      kep.aMode === 'a' ? nums.aOrAlt : EARTH_EQUATORIAL_RADIUS_KM + nums.aOrAlt;
    if (a_km <= EARTH_EQUATORIAL_RADIUS_KM) {
      setError('장반경이 지구 반경보다 커야 합니다');
      return;
    }
    if (nums.e < 0 || nums.e >= 1) {
      setError('이심률은 0 ≤ e < 1 이어야 합니다');
      return;
    }
    if (a_km * (1 - nums.e) <= EARTH_EQUATORIAL_RADIUS_KM) {
      setError('근지점이 지표면 아래입니다 (a·(1-e) ≤ R_E)');
      return;
    }
    const epochMs = Date.parse(kep.epochIso);
    if (Number.isNaN(epochMs)) {
      setError('epoch은 ISO UTC 형식이어야 합니다 (예: 2026-07-16T12:00:00Z)');
      return;
    }
    onSubmit(name.trim(), {
      kind: 'kepler',
      a_km,
      e: nums.e,
      i_deg: nums.i_deg,
      raan_deg: nums.raan_deg,
      argp_deg: nums.argp_deg,
      m0_deg: nums.m0_deg,
      epochMs,
    });
  };

  const inputCls =
    'w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none';
  const labelCls = 'mb-0.5 block text-[10px] uppercase tracking-wide text-slate-400';

  return (
    <div className="space-y-2 rounded border border-slate-700 bg-slate-800/60 p-2.5">
      <div className="flex gap-1">
        {(['tle', 'kepler'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${
              mode === m
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {m === 'tle' ? 'TLE' : '케플러 요소'}
          </button>
        ))}
      </div>

      <div>
        <label className={labelCls}>이름</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: ISS (ZARYA)"
        />
      </div>

      {mode === 'tle' ? (
        <>
          <div>
            <label className={labelCls}>Line 1</label>
            <textarea
              className={`${inputCls} font-mono`}
              rows={2}
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="1 25544U 98067A   ..."
            />
          </div>
          <div>
            <label className={labelCls}>Line 2</label>
            <textarea
              className={`${inputCls} font-mono`}
              rows={2}
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="2 25544  51.6400 ..."
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="w-24">
              <label className={labelCls}>입력 방식</label>
              <select
                className={inputCls}
                value={kep.aMode}
                onChange={(e) => setK({ aMode: e.target.value as 'a' | 'alt' })}
              >
                <option value="alt">고도 km</option>
                <option value="a">a km</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelCls}>
                {kep.aMode === 'a' ? '장반경 a [km]' : '고도 [km]'}
              </label>
              <input
                className={inputCls}
                value={kep.aOrAlt}
                onChange={(e) => setK({ aOrAlt: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>이심률 e</label>
              <input
                className={inputCls}
                value={kep.e}
                onChange={(e) => setK({ e: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>경사각 i [deg]</label>
              <input
                className={inputCls}
                value={kep.i_deg}
                onChange={(e) => setK({ i_deg: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>RAAN Ω [deg]</label>
              <input
                className={inputCls}
                value={kep.raan_deg}
                onChange={(e) => setK({ raan_deg: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>근지점 인수 ω [deg]</label>
              <input
                className={inputCls}
                value={kep.argp_deg}
                onChange={(e) => setK({ argp_deg: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>평균근점이각 M₀ [deg]</label>
              <input
                className={inputCls}
                value={kep.m0_deg}
                onChange={(e) => setK({ m0_deg: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Epoch (ISO UTC)</label>
            <input
              className={`${inputCls} font-mono`}
              value={kep.epochIso}
              onChange={(e) => setK({ epochIso: e.target.value })}
              placeholder="2026-07-16T12:00:00Z"
            />
          </div>
        </>
      )}

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

/**
 * 시간 제어 바: 재생/일시정지, 배속, ±24h 슬라이더, Now 리셋, 시각 표시.
 * 슬라이더는 "실제 현재 UTC" 기준 오프셋(분)으로 동작한다.
 */
import { SPEED_OPTIONS, useTimeStore } from '../store/timeControl';
import { MS_PER_MIN } from '../lib/constants';

const SLIDER_RANGE_MIN = 24 * 60; // ±24h [min]

export default function TimeControls() {
  const simTimeMs = useTimeStore((s) => s.simTimeMs);
  const isPlaying = useTimeStore((s) => s.isPlaying);
  const speed = useTimeStore((s) => s.speed);
  const { togglePlay, setSpeed, setSimTime, resetToNow } = useTimeStore.getState();

  const offsetMin = Math.round((simTimeMs - Date.now()) / MS_PER_MIN);
  const clampedOffset = Math.max(-SLIDER_RANGE_MIN, Math.min(SLIDER_RANGE_MIN, offsetMin));

  const simDate = new Date(simTimeMs);

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2">
      <button
        onClick={togglePlay}
        className="w-9 rounded bg-cyan-600 py-1 text-sm font-bold text-white hover:bg-cyan-500"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      <div className="flex overflow-hidden rounded border border-slate-700">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 text-xs ${
              speed === s
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="flex min-w-56 flex-1 items-center gap-2">
        <span className="text-[10px] text-slate-500">-24h</span>
        <input
          type="range"
          min={-SLIDER_RANGE_MIN}
          max={SLIDER_RANGE_MIN}
          step={1}
          value={clampedOffset}
          onChange={(e) => setSimTime(Date.now() + Number(e.target.value) * MS_PER_MIN)}
          className="w-full accent-cyan-500"
        />
        <span className="text-[10px] text-slate-500">+24h</span>
      </div>

      <button
        onClick={resetToNow}
        className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
      >
        Now
      </button>

      <div className="text-right font-mono text-xs leading-tight">
        <div className="text-cyan-300">
          {simDate.toISOString().slice(0, 19).replace('T', ' ')} UTC
        </div>
        <div className="text-slate-500">
          {simDate.toLocaleString()} 로컬
          {offsetMin !== 0 && (
            <span className="ml-1 text-amber-400">
              ({offsetMin > 0 ? '+' : ''}
              {offsetMin}min)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { describe, expect, it } from 'vitest';
import { splitAtAntimeridian, type LonLat } from './groundtrack';

describe('splitAtAntimeridian', () => {
  it('경도 179° → -179° 시퀀스에서 세그먼트 2개로 분리', () => {
    const pts: LonLat[] = [
      [177, 10],
      [178, 11],
      [179, 12],
      [-179, 13],
      [-178, 14],
    ];
    const segs = splitAtAntimeridian(pts);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual([
      [177, 10],
      [178, 11],
      [179, 12],
    ]);
    expect(segs[1]).toEqual([
      [-179, 13],
      [-178, 14],
    ]);
  });

  it('경계 통과가 없으면 세그먼트 1개', () => {
    const pts: LonLat[] = [
      [-10, 0],
      [0, 5],
      [10, 10],
    ];
    expect(splitAtAntimeridian(pts)).toHaveLength(1);
  });

  it('서→동 방향(-179° → 179°) 통과도 분리', () => {
    const pts: LonLat[] = [
      [-178, 0],
      [-179, 1],
      [179, 2],
      [178, 3],
    ];
    const segs = splitAtAntimeridian(pts);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toHaveLength(2);
    expect(segs[1]).toHaveLength(2);
  });

  it('여러 번 통과하면 통과 횟수+1개 세그먼트', () => {
    const pts: LonLat[] = [
      [179, 0],
      [-179, 1],
      [-178, 2],
      [-179, 3],
      [179, 4],
    ];
    expect(splitAtAntimeridian(pts)).toHaveLength(3);
  });

  it('빈 입력 → 빈 배열', () => {
    expect(splitAtAntimeridian([])).toEqual([]);
  });
});

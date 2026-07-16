// 시드 TLE 체크섬 계산 + satellite.js 파싱/전파 검증
import * as satellite from 'satellite.js';

function checksum(line68) {
  let sum = 0;
  for (const ch of line68) {
    if (ch >= '0' && ch <= '9') sum += ch.charCodeAt(0) - 48;
    else if (ch === '-') sum += 1;
  }
  return sum % 10;
}

// 68자(체크섬 제외) 본문 — 열 위치 엄수
const l1body = '1 25544U 98067A   26197.50000000  .00016717  00000+0  30328-3 0  999';
const l2body = '2 25544  51.6400 208.9163 0006317  69.9862 254.3157 15.4981464112345';

console.log('l1body len:', l1body.length, 'l2body len:', l2body.length);
const line1 = l1body + checksum(l1body);
const line2 = l2body + checksum(l2body);
console.log('LINE1:', JSON.stringify(line1), line1.length);
console.log('LINE2:', JSON.stringify(line2), line2.length);

const rec = satellite.twoline2satrec(line1, line2);
console.log('satrec.error:', rec.error);
console.log('jdsatepoch:', rec.jdsatepoch, '->', new Date((rec.jdsatepoch - 2440587.5) * 86400000).toISOString());
console.log('no (rad/min):', rec.no, 'period min:', (2 * Math.PI) / rec.no);

const epochDate = new Date((rec.jdsatepoch - 2440587.5) * 86400000);
for (const dh of [0, 1, 12, 24, 24 * 7]) {
  const d = new Date(epochDate.getTime() + dh * 3600000);
  const pv = satellite.propagate(rec, d);
  if (!pv || typeof pv.position === 'boolean') {
    console.log(`t=+${dh}h: PROPAGATION FAILED`);
    continue;
  }
  const r = Math.hypot(pv.position.x, pv.position.y, pv.position.z);
  console.log(`t=+${dh}h: |r|=${r.toFixed(1)} km (alt ${(r - 6371).toFixed(1)} km)`);
}

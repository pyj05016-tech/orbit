/**
 * d3-geo로 world-atlas 육지 폴리곤을 equirectangular 캔버스에 그려
 * three.js 지구 텍스처로 사용한다. 외부 이미지 의존 없음.
 * 텍스처 좌표: 좌측 경도 -180°, 우측 +180°, 상단 위도 +90°.
 */
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { getLandFeatures } from './worldMap';

export function createEarthCanvas(width = 2048, height = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context 생성 실패');

  // equirectangular: 전체 지구가 캔버스에 정확히 맞도록 scale = width / 2π
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection, ctx);

  // 바다
  ctx.fillStyle = '#0c2340';
  ctx.fillRect(0, 0, width, height);

  // 경위선망
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 육지
  ctx.beginPath();
  path(getLandFeatures());
  ctx.fillStyle = '#2f6b4f';
  ctx.fill();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas;
}

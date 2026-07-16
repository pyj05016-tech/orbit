/**
 * 3D 지구 궤도 뷰 (three.js).
 *
 * 좌표 규약: ECI(z-up, km) → three.js(y-up, 1 unit = 1000 km) 매핑은
 *   (x, y, z)_eci → (x, z, -y)_three  (행렬식 +1, 우handed 유지)
 * 지구 메시는 GMST만큼 three-Y축 회전 → ECEF 고정 지물(지상국)은 earthGroup 자식.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GroundStation, Satellite } from '../types';
import {
  EARTH_RADIUS_KM,
  ORBIT_LINE_SAMPLES,
  SCENE_UNITS_PER_KM,
  MS_PER_SEC,
} from '../lib/constants';
import { propagate, orbitalPeriodSec } from '../lib/propagator';
import { gmstAt, geodeticToEcf, eciToLookAngles } from '../lib/coordinates';
import { useTimeStore } from '../store/timeControl';
import { createEarthCanvas } from '../lib/earthTexture';

const EARTH_RADIUS_UNITS = EARTH_RADIUS_KM * SCENE_UNITS_PER_KM;

function eciToThree(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    p.x * SCENE_UNITS_PER_KM,
    p.z * SCENE_UNITS_PER_KM,
    -p.y * SCENE_UNITS_PER_KM,
  );
}

/** ECEF [km] → three (earthGroup 로컬) */
function ecfToThreeLocal(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    p.x * SCENE_UNITS_PER_KM,
    p.z * SCENE_UNITS_PER_KM,
    -p.y * SCENE_UNITS_PER_KM,
  );
}

/** ECEF [km] → ECI [km] (gmst 회전) */
function ecfToEci(
  p: { x: number; y: number; z: number },
  gmst_rad: number,
): { x: number; y: number; z: number } {
  const c = Math.cos(gmst_rad);
  const s = Math.sin(gmst_rad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = '28px sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 16;
  const h = 40;
  canvas.width = w;
  canvas.height = h;
  const ctx2 = canvas.getContext('2d')!;
  ctx2.font = font;
  ctx2.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx2.fillRect(0, 0, w, h);
  ctx2.fillStyle = color;
  ctx2.textBaseline = 'middle';
  ctx2.fillText(text, 8, h / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  const scale = 0.014;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}

interface SatObjects {
  orbitLine: THREE.Line;
  marker: THREE.Mesh;
  label: THREE.Sprite;
  sourceKey: string;
}

interface Props {
  satellites: Satellite[];
  stations: GroundStation[];
}

export default function Globe3D({ satellites, stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneApiRef = useRef<{
    scene: THREE.Scene;
    earthGroup: THREE.Group;
    inertialGroup: THREE.Group;
  } | null>(null);
  const satObjectsRef = useRef<Map<string, SatObjects>>(new Map());
  const stationObjectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const losLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  // 프레임 루프에서 최신 props를 읽기 위한 ref
  const dataRef = useRef({ satellites, stations });
  dataRef.current = { satellites, stations };

  // 씬 생성/파괴 (마운트당 1회)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617');

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      500,
    );
    camera.position.set(14, 9, 14);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = EARTH_RADIUS_UNITS * 1.2;
    controls.maxDistance = 120;

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(50, 20, 30);
    scene.add(sun);

    // 지구 (GMST 자전 그룹)
    const earthGroup = new THREE.Group();
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 64, 64);
    const earthTexture = new THREE.CanvasTexture(createEarthCanvas());
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);
    scene.add(earthGroup);

    // 자전축 표시(북극 방향 얇은 선)
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -EARTH_RADIUS_UNITS * 1.15, 0),
      new THREE.Vector3(0, EARTH_RADIUS_UNITS * 1.15, 0),
    ]);
    const axisLine = new THREE.Line(
      axisGeom,
      new THREE.LineBasicMaterial({ color: 0x475569 }),
    );
    scene.add(axisLine);

    const inertialGroup = new THREE.Group();
    scene.add(inertialGroup);

    sceneApiRef.current = { scene, earthGroup, inertialGroup };

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const frame = () => {
      const simTimeMs = useTimeStore.getState().simTimeMs;
      const gmst = gmstAt(simTimeMs);
      earthGroup.rotation.y = gmst;

      // 위성 위치 갱신 (전파: 위성당 프레임당 1회)
      const eciBySat = new Map<string, { x: number; y: number; z: number }>();
      for (const sat of dataRef.current.satellites) {
        const objs = satObjectsRef.current.get(sat.id);
        if (!objs) continue;
        const sv = propagate(sat.source, simTimeMs);
        if (!sv) {
          objs.marker.visible = false;
          objs.label.visible = false;
          continue;
        }
        eciBySat.set(sat.id, sv.positionEci);
        const pos = eciToThree(sv.positionEci);
        objs.marker.visible = true;
        objs.label.visible = true;
        objs.marker.position.copy(pos);
        objs.label.position.copy(pos).add(new THREE.Vector3(0, 0.45, 0));
      }

      // LOS 라인 갱신
      for (const [key, line] of losLinesRef.current) {
        const [satId, gsId] = key.split('|');
        const sat = dataRef.current.satellites.find((s) => s.id === satId);
        const gs = dataRef.current.stations.find((g) => g.id === gsId);
        const satEci = eciBySat.get(satId);
        if (!sat || !gs || !satEci) {
          line.visible = false;
          continue;
        }
        const la = eciToLookAngles(
          { lat_deg: gs.lat_deg, lon_deg: gs.lon_deg, alt_m: gs.alt_m },
          satEci,
          simTimeMs,
        );
        if (la.elevation_deg < gs.minElevation_deg) {
          line.visible = false;
          continue;
        }
        const gsEci = ecfToEci(geodeticToEcf(gs.lat_deg, gs.lon_deg, gs.alt_m), gmst);
        const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const a = eciToThree(gsEci);
        const b = eciToThree(satEci);
        positions.setXYZ(0, a.x, a.y, a.z);
        positions.setXYZ(1, b.x, b.y, b.z);
        positions.needsUpdate = true;
        line.visible = true;
      }

      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      // 씬 전체 리소스 해제 (메모리 누수 방지)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      earthTexture.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneApiRef.current = null;
      satObjectsRef.current.clear();
      stationObjectsRef.current.clear();
      losLinesRef.current.clear();
    };
  }, []);

  // 위성 객체 동기화 — 궤도 라인은 소스가 바뀔 때만 재계산(캐싱)
  useEffect(() => {
    const api = sceneApiRef.current;
    if (!api) return;
    const existing = satObjectsRef.current;
    const wanted = new Map(satellites.map((s) => [s.id, s]));

    // 제거
    for (const [id, objs] of existing) {
      const sat = wanted.get(id);
      const sourceKey = sat ? JSON.stringify(sat.source) + sat.color : '';
      if (!sat || objs.sourceKey !== sourceKey) {
        api.inertialGroup.remove(objs.orbitLine, objs.marker, objs.label);
        objs.orbitLine.geometry.dispose();
        (objs.orbitLine.material as THREE.Material).dispose();
        objs.marker.geometry.dispose();
        (objs.marker.material as THREE.Material).dispose();
        objs.label.material.map?.dispose();
        objs.label.material.dispose();
        existing.delete(id);
      }
    }

    // 추가
    for (const sat of satellites) {
      if (existing.has(sat.id)) continue;
      const sourceKey = JSON.stringify(sat.source) + sat.color;

      // 1주기 샘플링한 궤도 라인
      const periodSec = orbitalPeriodSec(sat.source);
      const t0 = useTimeStore.getState().simTimeMs;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= ORBIT_LINE_SAMPLES; i++) {
        const t = t0 + (i / ORBIT_LINE_SAMPLES) * periodSec * MS_PER_SEC;
        const sv = propagate(sat.source, t);
        if (sv) pts.push(eciToThree(sv.positionEci));
      }
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const orbitLine = new THREE.Line(
        orbitGeom,
        new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.7 }),
      );

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 16),
        new THREE.MeshBasicMaterial({ color: sat.color }),
      );
      const label = makeLabelSprite(sat.name, sat.color);

      api.inertialGroup.add(orbitLine, marker, label);
      existing.set(sat.id, { orbitLine, marker, label, sourceKey });
    }
  }, [satellites]);

  // 지상국 마커 동기화 (earthGroup 자식 — 지구와 함께 자전)
  useEffect(() => {
    const api = sceneApiRef.current;
    if (!api) return;
    const existing = stationObjectsRef.current;
    const wanted = new Set(stations.map((g) => g.id));

    for (const [id, obj] of existing) {
      if (!wanted.has(id)) {
        api.earthGroup.remove(obj);
        obj.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
          if (o instanceof THREE.Sprite) {
            o.material.map?.dispose();
            o.material.dispose();
          }
        });
        existing.delete(id);
      }
    }

    for (const gs of stations) {
      if (existing.has(gs.id)) continue;
      const group = new THREE.Group();
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.18, 12),
        new THREE.MeshBasicMaterial({ color: gs.color }),
      );
      const pos = ecfToThreeLocal(geodeticToEcf(gs.lat_deg, gs.lon_deg, gs.alt_m));
      marker.position.copy(pos);
      // 콘이 바깥(법선) 방향을 향하도록
      marker.lookAt(pos.clone().multiplyScalar(2));
      marker.rotateX(Math.PI / 2);
      const label = makeLabelSprite(gs.name, gs.color);
      label.position.copy(pos).multiplyScalar(1.06);
      group.add(marker, label);
      api.earthGroup.add(group);
      existing.set(gs.id, group);
    }
  }, [stations]);

  // LOS 라인 객체 동기화 (위성 × 지상국)
  useEffect(() => {
    const api = sceneApiRef.current;
    if (!api) return;
    const existing = losLinesRef.current;
    const wantedKeys = new Set(
      satellites.flatMap((s) => stations.map((g) => `${s.id}|${g.id}`)),
    );

    for (const [key, line] of existing) {
      if (!wantedKeys.has(key)) {
        api.inertialGroup.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        existing.delete(key);
      }
    }

    for (const key of wantedKeys) {
      if (existing.has(key)) continue;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 }),
      );
      line.frustumCulled = false;
      line.visible = false;
      api.inertialGroup.add(line);
      existing.set(key, line);
    }
  }, [satellites, stations]);

  return <div ref={containerRef} className="h-full w-full" data-testid="globe3d" />;
}

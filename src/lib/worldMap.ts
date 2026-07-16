/**
 * world-atlas TopoJSON → GeoJSON 로딩 (번들에 포함, 네트워크 불필요).
 * 3D 텍스처와 2D 지도에서 공용.
 */
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landTopoJson from 'world-atlas/land-110m.json';

let cached: FeatureCollection<Geometry> | null = null;

export function getLandFeatures(): FeatureCollection<Geometry> {
  if (!cached) {
    const topo = landTopoJson as unknown as Topology<{ land: GeometryCollection }>;
    cached = feature(topo, topo.objects.land) as FeatureCollection<Geometry>;
  }
  return cached;
}

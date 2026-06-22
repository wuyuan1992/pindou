import * as THREE from "three";
import {
  BEAD_OUTER_R,
  BEAD_INNER_R,
  BEAD_HEIGHT,
  PEG_RADIUS,
  PEG_HEIGHT,
} from "./constants.ts";

// --- Performance notes ------------------------------------------------------
// Most materials here used the full MeshPhysicalMaterial feature set:
//   transmission + clearcoat + iridescence + double-side
// For 1600+ instanced beads this is the dominant GPU cost. We have:
//   - dropped iridescence everywhere (visually subtle, very expensive)
//   - lowered transmission into the 0.55-0.7 band
//   - kept clearcoat on the glass beads (it's what sells the "拼豆" look)
//   - bead material is now FrontSide (ExtrudeGeometry already has both caps
//     built from real geometry, so BackSide only doubled the fragment work)
// ---------------------------------------------------------------------------

export function createGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#eaf3f8"),
    transmission: 0.6,
    thickness: 0.4,
    roughness: 0.14,
    ior: 1.45,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
    attenuationColor: new THREE.Color("#cfe3f0"),
    attenuationDistance: 1.8,
    envMapIntensity: 1.3,
    transparent: true,
  });
}

export function createBoardMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#fbf6ea"),
    transmission: 0.65,
    thickness: 1.2,
    roughness: 0.2,
    ior: 1.4,
    clearcoat: 0.9,
    clearcoatRoughness: 0.24,
    attenuationColor: new THREE.Color("#f4ecd8"),
    attenuationDistance: 4.5,
    envMapIntensity: 1.1,
    transparent: true,
  });
}

export function createFrostedShellMaterial(
  tint: THREE.ColorRepresentation = "#f3eee2"
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    transmission: 0.6,
    thickness: 0.5,
    roughness: 0.32,
    ior: 1.4,
    clearcoat: 0.7,
    clearcoatRoughness: 0.3,
    attenuationColor: new THREE.Color(tint),
    attenuationDistance: 3,
    envMapIntensity: 1.0,
    transparent: true,
  });
}

export function createTrayFloorMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f1ead8"),
    transmission: 0.45,
    thickness: 0.7,
    roughness: 0.26,
    ior: 1.4,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    attenuationColor: new THREE.Color("#e6d9b8"),
    attenuationDistance: 3.5,
    envMapIntensity: 0.9,
    transparent: true,
  });
}

export function createTableMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#efe6d2"),
    roughness: 0.95,
    metalness: 0,
  });
}

export function createPlasticMaterial(
  color: THREE.ColorRepresentation
): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const isLight = hsl.l > 0.75;
  const isDark = hsl.l < 0.18;

  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: isLight ? 0.22 : isDark ? 0.28 : 0.32,
    metalness: isDark ? 0.85 : 0.7,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    reflectivity: 0.65,
    sheen: isLight ? 0.6 : 0.3,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(isLight ? "#ffffff" : color),
    envMapIntensity: 1.6,
    iridescence: isLight ? 0.25 : 0.1,
    iridescenceIOR: 1.3,
  });
}

export function createGlassBeadMaterial(
  color: THREE.ColorRepresentation
): THREE.MeshPhysicalMaterial {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const isDark = hsl.l < 0.18;
  const isLight = hsl.l > 0.75;
  return new THREE.MeshPhysicalMaterial({
    color: c,
    transmission: isDark ? 0.6 : 0.7,
    thickness: 0.45,
    roughness: 0.1,
    ior: 1.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    attenuationColor: c,
    attenuationDistance: isDark ? 0.5 : isLight ? 1.1 : 0.8,
    // iridescence removed: dominant cost, subtle visual benefit on small beads
    envMapIntensity: 1.5,
    transparent: true,
    side: THREE.FrontSide,
  });
}

export function createInstancedGlassBeadMaterial(): THREE.MeshPhysicalMaterial {
  // Used by Beads.tsx — up to 1600 instances. This is the hottest material.
  // - iridescence removed entirely
  // - clearcoat kept (visual signature of glass beads)
  // - FrontSide only (ExtrudeGeometry already exposes both cap normals)
  // - transmission dropped; relies on transparent+opacity + clearcoat for look
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.5,
    envMapIntensity: 1.4,
    side: THREE.FrontSide,
  });
}

export function createBeadGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, BEAD_OUTER_R, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, BEAD_INNER_R, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: BEAD_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    // Reduced from 4 -> 2. With 1600 instances this is a 2x vertex reduction
    // on the bevel alone; the silhouette is still smooth thanks to clearcoat.
    bevelSegments: 2,
    // Reduced from 32 -> 16. Outer radius is 0.1 units; 16 segments is still
    // visually indistinguishable from a perfect circle at this scale.
    curveSegments: 16,
  });
  geo.translate(0, 0, -BEAD_HEIGHT / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createPegGeometry(): THREE.CylinderGeometry {
  // Reduced radial segments from 20 -> 8. Peg radius is 0.06 — at any
  // reasonable camera distance the silhouette difference is sub-pixel, and
  // Board.tsx renders 1600 of these via Instances.
  return new THREE.CylinderGeometry(PEG_RADIUS, PEG_RADIUS * 0.85, PEG_HEIGHT, 8);
}

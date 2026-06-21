import * as THREE from "three";
import {
  BEAD_OUTER_R,
  BEAD_INNER_R,
  BEAD_HEIGHT,
  PEG_RADIUS,
  PEG_HEIGHT,
} from "./constants.ts";

export function createGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#eaf3f8"),
    transmission: 0.7,
    thickness: 0.5,
    roughness: 0.12,
    ior: 1.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    attenuationColor: new THREE.Color("#cfe3f0"),
    attenuationDistance: 1.8,
    envMapIntensity: 1.5,
    transparent: true,
  });
}

export function createBoardMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#fbf6ea"),
    transmission: 0.82,
    thickness: 1.4,
    roughness: 0.18,
    ior: 1.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.22,
    attenuationColor: new THREE.Color("#f4ecd8"),
    attenuationDistance: 4.5,
    envMapIntensity: 1.25,
    transparent: true,
  });
}

export function createFrostedShellMaterial(
  tint: THREE.ColorRepresentation = "#f3eee2"
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    transmission: 0.78,
    thickness: 0.6,
    roughness: 0.28,
    ior: 1.4,
    clearcoat: 0.95,
    clearcoatRoughness: 0.25,
    attenuationColor: new THREE.Color(tint),
    attenuationDistance: 3,
    envMapIntensity: 1.1,
    transparent: true,
  });
}

export function createTrayFloorMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f1ead8"),
    transmission: 0.55,
    thickness: 0.8,
    roughness: 0.22,
    ior: 1.4,
    clearcoat: 0.9,
    clearcoatRoughness: 0.2,
    attenuationColor: new THREE.Color("#e6d9b8"),
    attenuationDistance: 3.5,
    envMapIntensity: 1.0,
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
    transmission: isDark ? 0.7 : 0.85,
    thickness: 0.5,
    roughness: 0.08,
    ior: 1.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    attenuationColor: c,
    attenuationDistance: isDark ? 0.5 : isLight ? 1.1 : 0.8,
    iridescence: 0.4,
    iridescenceIOR: 1.8,
    envMapIntensity: 1.8,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export function createInstancedGlassBeadMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    ior: 1.5,
    iridescence: 0.4,
    iridescenceIOR: 1.6,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
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
    bevelSegments: 4,
    curveSegments: 32,
  });
  geo.translate(0, 0, -BEAD_HEIGHT / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createPegGeometry(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(PEG_RADIUS, PEG_RADIUS * 0.85, PEG_HEIGHT, 20);
}

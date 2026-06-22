import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBeadStore } from "../store/useBeadStore.ts";
import { getColor } from "../data/colors.ts";
import { createBeadGeometry, createInstancedGlassBeadMaterial } from "./materials.ts";
import { BEAD_CENTER_Y, BOARD_N, CELL } from "./constants.ts";

interface PlacedBead {
  col: number;
  row: number;
  color: string;
}

const dummy = new THREE.Object3D();
const colorObj = new THREE.Color();

export function Beads() {
  const grid = useBeadStore((s) => s.grid);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => createBeadGeometry(), []);
  const material = useMemo(() => createInstancedGlassBeadMaterial(), []);

  const placed = useMemo<PlacedBead[]>(() => {
    const result: PlacedBead[] = [];
    for (let i = 0; i < grid.length; i++) {
      const colorId = grid[i];
      if (!colorId) continue;
      const color = getColor(colorId);
      const col = i % BOARD_N;
      const row = Math.floor(i / BOARD_N);
      result.push({ col, row, color: color.base });
    }
    return result;
  }, [grid]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const half = (BOARD_N - 1) / 2;
    placed.forEach((p, i) => {
      dummy.position.set((p.col - half) * CELL, BEAD_CENTER_Y, (p.row - half) * CELL);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      colorObj.set(p.color);
      mesh.setColorAt(i, colorObj);
    });
    mesh.count = placed.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placed]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, BOARD_N * BOARD_N]}
      castShadow
      receiveShadow
      renderOrder={1}
    />
  );
}

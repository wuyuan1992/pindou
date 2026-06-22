import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBeadStore } from "../store/useBeadStore.ts";
import { getColor } from "../data/colors.ts";
import { createBeadGeometry, createInstancedGlassBeadMaterial } from "./materials.ts";
import { BEAD_CENTER_Y, BOARD_N, CELL } from "./constants.ts";

// Fixed-slot InstancedMesh strategy:
// - Capacity is always BOARD_N * BOARD_N = 1600
// - instance idx === grid idx (1:1, stable for the lifetime of the board)
// - mesh.count stays at 1600; empty slots are scaled to 0 (GPU culls them)
// - On grid change, we diff against the previous grid slice and write only
//   the changed slots. Single-cell paint/erase is O(1); loadTemplate / clear /
//   undo are O(changed cells). No more placed.length scan per frame.

const CAPACITY = BOARD_N * BOARD_N;
const HALF = (BOARD_N - 1) / 2;

const dummy = new THREE.Object3D();
const colorObj = new THREE.Color();

export function Beads() {
  const grid = useBeadStore((s) => s.grid);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Previous grid snapshot used for diffing. null = first mount.
  const prevGridRef = useRef<Array<string | null> | null>(null);

  const geometry = useMemo(() => createBeadGeometry(), []);
  const material = useMemo(() => createInstancedGlassBeadMaterial(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const prev = prevGridRef.current;
    const isFirstMount = prev === null;
    const len = grid.length;

    // Touch instanceColor once on first mount so the buffer exists and per-
    // instance color writes have somewhere to go. setColorAt lazily allocates
    // it, but we want to be explicit and avoid relying on per-iteration
    // branching.
    if (isFirstMount && !mesh.instanceColor) {
      mesh.setColorAt(0, colorObj);
    }

    const changed: number[] = [];
    if (isFirstMount) {
      // Write every slot once: non-empty slots get position+color, empty slots
      // get a scale=0 matrix so the GPU skips them.
      for (let i = 0; i < len; i++) {
        writeSlot(mesh, i, grid[i]);
        changed.push(i);
      }
    } else {
      // Diff: only write slots whose value actually changed.
      for (let i = 0; i < len; i++) {
        if (prev![i] !== grid[i]) {
          writeSlot(mesh, i, grid[i]);
          changed.push(i);
        }
      }
    }

    prevGridRef.current = grid.slice();

    if (changed.length > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [grid]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, CAPACITY]}
      // Fixed capacity; empty slots are scaled to 0 in writeSlot().
      count={CAPACITY}
      castShadow
      receiveShadow
      renderOrder={1}
    />
  );
}

// Write a single slot. colorId === null means hide (scale 0); otherwise place
// at the slot's world position with the bead color.
function writeSlot(
  mesh: THREE.InstancedMesh,
  i: number,
  colorId: string | null
): void {
  if (colorId === null) {
    dummy.position.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    return;
  }
  const col = i % BOARD_N;
  const row = Math.floor(i / BOARD_N);
  dummy.position.set((col - HALF) * CELL, BEAD_CENTER_Y, (row - HALF) * CELL);
  dummy.rotation.set(-Math.PI / 2, 0, 0);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  colorObj.set(getColor(colorId).base);
  mesh.setColorAt(i, colorObj);
}

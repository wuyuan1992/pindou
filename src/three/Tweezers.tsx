import { useMemo } from "react";
import * as THREE from "three";
import { STACK_SIZE } from "../store/useStackStore.ts";

const ROD_RADIUS = 0.04;
const ROD_TIP_Y = -0.45;
const ROD_OFFSET_X = 0.42;
const ROD_HANDLE_Y = STACK_SIZE + 3;
const ROD_LENGTH = ROD_HANDLE_Y - ROD_TIP_Y;
const ROD_CENTER_Y = (ROD_TIP_Y + ROD_HANDLE_Y) / 2;

const HANDLE_THICKNESS = 0.2;
const HANDLE_WIDTH = ROD_OFFSET_X + 0.22;

export function Tweezers() {
  const metal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#c8c8d0"),
        roughness: 0.3,
        metalness: 0.85,
        envMapIntensity: 1.4,
      }),
    []
  );

  const handleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7a5230"),
        roughness: 0.6,
        metalness: 0.1,
      }),
    []
  );

  return (
    <group>
      {/* 穿过豆子的那根筷子（x=0） */}
      <mesh position={[0, ROD_CENTER_Y, 0]} material={metal} castShadow>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 16]} />
      </mesh>

      {/* 平行的另一根 */}
      <mesh position={[ROD_OFFSET_X, ROD_CENTER_Y, 0]} material={metal} castShadow>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 16]} />
      </mesh>

      {/* 手柄连接块（y=手柄端） */}
      <mesh
        position={[ROD_OFFSET_X / 2, ROD_HANDLE_Y + 0.05, 0]}
        material={handleMat}
        castShadow
      >
        <boxGeometry args={[HANDLE_WIDTH, 0.35, HANDLE_THICKNESS]} />
      </mesh>

      {/* 镊尖收尖 */}
      <mesh position={[ROD_OFFSET_X * 0.5, ROD_TIP_Y - 0.04, 0]} material={metal}>
        <cylinderGeometry args={[ROD_RADIUS * 0.4, ROD_RADIUS * 1.2, 0.12, 16]} />
      </mesh>
    </group>
  );
}

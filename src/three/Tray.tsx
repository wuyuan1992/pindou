import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useTrayStore } from "../store/useTrayStore.ts";
import { useStackStore, STACK_SIZE } from "../store/useStackStore.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { getColor } from "../data/colors.ts";
import {
  createBeadGeometry,
  createGlassBeadMaterial,
  createFrostedShellMaterial,
  createTrayFloorMaterial,
} from "./materials.ts";
import { BEAD_HEIGHT } from "./constants.ts";
import { ItemHandler } from "./Handler.tsx";

const TRAY_SIZE_X = 5.23;
const TRAY_SIZE_Z = 4.025;
const TRAY_WALL_H = 0.225;
const TRAY_WALL_T = 0.035;

const PUSH_RADIUS = 0.31;
const PUSH_FORCE = 6;
const DAMPING_RATE = 2.6;
const WALL_RESTITUTION = 0.4;
const BEAD_DIAMETER = 0.42;
const COLLISION_SLOP = 0.92;

const REPEAT_INTERVAL = 0.16;
const MAX_TRAY_BEADS = 120;
const PICK_RADIUS = 0.275;

interface TrayProps {
  onDrop?: (colorId: string) => void;
  onPick?: (colorId: string) => void;
}

interface BeadPhysics {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

export function Tray({ onDrop, onPick }: TrayProps) {
  const beads = useTrayStore((s) => s.beads);
  const add = useTrayStore((s) => s.add);
  const removeById = useTrayStore((s) => s.removeById);
  const transform = useLayoutStore((s) => s.transforms.tray);
  const dragging = useLayoutStore((s) => s.draggingItem);
  const trayPos = transform.position;
  const trayRot = transform.rotationY;

  const physicsRef = useRef<Map<string, BeadPhysics>>(new Map());
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const beadGeometry = useMemo(() => createBeadGeometry(), []);
  const materialCache = useMemo(() => {
    const cache = new Map<string, THREE.MeshPhysicalMaterial>();
    return (colorId: string) => {
      let m = cache.get(colorId);
      if (!m) {
        const color = getColor(colorId);
        m = createGlassBeadMaterial(color.base);
        cache.set(colorId, m);
      }
      return m;
    };
  }, []);

  useEffect(() => {
    const physics = physicsRef.current;
    const currentIds = new Set(beads.map((b) => b.id));
    for (const id of Array.from(physics.keys())) {
      if (!currentIds.has(id)) {
        physics.delete(id);
        meshRefs.current.delete(id);
      }
    }
    beads.forEach((b) => {
      if (!physics.has(b.id)) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * (TRAY_SIZE_X / 2 - 1);
        physics.set(b.id, {
          pos: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r),
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            0,
            (Math.random() - 0.5) * 1.5
          ),
        });
      }
    });
  }, [beads]);

  useEffect(() => {
    return () => {
      physicsRef.current.clear();
      meshRefs.current.clear();
    };
  }, []);

  const tryDropOne = (): boolean => {
    if (useTrayStore.getState().beads.length >= MAX_TRAY_BEADS) return false;
    const colorId = useStackStore.getState().pop();
    if (!colorId) return false;
    add(colorId);
    onDrop?.(colorId);
    return true;
  };

  const tryPickOne = (id: string): boolean => {
    if (useStackStore.getState().stack.length >= STACK_SIZE) return false;
    const colorId = removeById(id);
    if (!colorId) return false;
    if (!useStackStore.getState().push(colorId)) {
      add(colorId);
      return false;
    }
    onPick?.(colorId);
    return true;
  };

  const pickTouched = (): boolean => {
    const physics = physicsRef.current;
    const dragPos = useGrabStore.getState().dragPos;
    if (!dragPos || physics.size === 0) return false;
    const cos = Math.cos(-trayRot);
    const sin = Math.sin(-trayRot);
    let targetId: string | null = null;
    let bestDistSq = PICK_RADIUS * PICK_RADIUS;
    physics.forEach((p, id) => {
      const wx = p.pos.x + trayPos[0];
      const wz = p.pos.z + trayPos[2];
      const dxW = dragPos[0] - wx;
      const dzW = dragPos[2] - wz;
      const localDx = dxW * cos - dzW * sin;
      const localDz = dxW * sin + dzW * cos;
      const d = localDx * localDx + localDz * localDz;
      if (d < bestDistSq) {
        bestDistSq = d;
        targetId = id;
      }
    });
    if (!targetId) return false;
    return tryPickOne(targetId);
  };

  const startRepeat = (fn: () => boolean) => {
    let n = 0;
    const timer = setInterval(() => {
      n++;
      if (!fn()) {
        clearInterval(timer);
        return;
      }
      if (n > 30) clearInterval(timer);
    }, REPEAT_INTERVAL * 1000);
    const cancel = () => {
      clearInterval(timer);
      window.removeEventListener("pointerup", cancel);
    };
    window.addEventListener("pointerup", cancel);
  };

  const handleTrayPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) return;
    if (e.button !== 2) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    if (!tryDropOne()) return;
    startRepeat(tryDropOne);
  };

  const handleBeadPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    const id = (e.object.userData?.id as string | undefined) ?? null;
    if (!id) return;
    if (!tryPickOne(id)) return;
    startRepeat(pickTouched);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
  };

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 0.033);
    const dragPos = useGrabStore.getState().dragPos;
    const physics = physicsRef.current;

    const cos = Math.cos(-trayRot);
    const sin = Math.sin(-trayRot);

    physics.forEach((p) => {
      if (dragPos) {
        const worldX = p.pos.x + trayPos[0];
        const worldZ = p.pos.z + trayPos[2];
        const dxW = dragPos[0] - worldX;
        const dzW = dragPos[2] - worldZ;
        const localDx = dxW * cos - dzW * sin;
        const localDz = dxW * sin + dzW * cos;
        const distSq = localDx * localDx + localDz * localDz;
        if (distSq < PUSH_RADIUS * PUSH_RADIUS && distSq > 0.0004) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / PUSH_RADIUS;
          p.vel.x += (localDx / dist) * falloff * PUSH_FORCE * dt;
          p.vel.z += (localDz / dist) * falloff * PUSH_FORCE * dt;
        }
      }
    });

    const entries = Array.from(physics.entries());
    const minDist = BEAD_DIAMETER * COLLISION_SLOP;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i][1];
        const b = entries[j][1];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const nz = dz / dist;
          a.pos.x -= nx * overlap;
          a.pos.z -= nz * overlap;
          b.pos.x += nx * overlap;
          b.pos.z += nz * overlap;
          const relVel = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
          if (relVel < 0) {
            a.vel.x += relVel * nx;
            a.vel.z += relVel * nz;
            b.vel.x -= relVel * nx;
            b.vel.z -= relVel * nz;
          }
        }
      }
    }

    const halfX = TRAY_SIZE_X / 2 - BEAD_DIAMETER / 2;
    const halfZ = TRAY_SIZE_Z / 2 - BEAD_DIAMETER / 2;
    const dampFactor = Math.pow(0.5, dt * DAMPING_RATE);

    physics.forEach((p, id) => {
      p.vel.x *= dampFactor;
      p.vel.z *= dampFactor;

      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;

      if (p.pos.x > halfX) {
        p.pos.x = halfX;
        p.vel.x = -Math.abs(p.vel.x) * WALL_RESTITUTION;
      } else if (p.pos.x < -halfX) {
        p.pos.x = -halfX;
        p.vel.x = Math.abs(p.vel.x) * WALL_RESTITUTION;
      }
      if (p.pos.z > halfZ) {
        p.pos.z = halfZ;
        p.vel.z = -Math.abs(p.vel.z) * WALL_RESTITUTION;
      } else if (p.pos.z < -halfZ) {
        p.pos.z = -halfZ;
        p.vel.z = Math.abs(p.vel.z) * WALL_RESTITUTION;
      }

      const mesh = meshRefs.current.get(id);
      if (mesh) {
        mesh.position.set(p.pos.x, BEAD_HEIGHT / 2, p.pos.z);
      }
    });
  });

  return (
    <group
      position={trayPos}
      rotation={[0, trayRot, 0]}
      onPointerDown={handleTrayPointerDown}
      onContextMenu={handleContextMenu}
    >
      <TrayShell />
      {beads.map((b) => (
        <mesh
          key={b.id}
          ref={(el) => {
            if (el) {
              meshRefs.current.set(b.id, el);
              el.userData.id = b.id;
            }
          }}
          geometry={beadGeometry}
          material={materialCache(b.colorId)}
          position={[0, BEAD_HEIGHT / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          renderOrder={2}
          onPointerDown={handleBeadPointerDown}
        />
      ))}
      <ItemHandler
        itemKey="tray"
        side="bottom"
        offset={[0, 0.2, TRAY_SIZE_Z / 2 + 0.09]}
        length={TRAY_SIZE_X - 0.15}
      />
    </group>
  );
}

function TrayShell() {
  const halfX = TRAY_SIZE_X / 2;
  const halfZ = TRAY_SIZE_Z / 2;
  const wallH = TRAY_WALL_H;

  const floorMat = useMemo(() => createTrayFloorMaterial(), []);
  const wallMat = useMemo(() => createFrostedShellMaterial("#f3ebd6"), []);

  return (
    <group>
      <RoundedBox
        args={[TRAY_SIZE_X, 0.05, TRAY_SIZE_Z]}
        radius={0.025}
        smoothness={4}
        position={[0, 0.025, 0]}
        material={floorMat}
        receiveShadow
      />
      {[
        { pos: [0, wallH / 2, halfZ - TRAY_WALL_T / 2], size: [TRAY_SIZE_X, wallH, TRAY_WALL_T] },
        { pos: [0, wallH / 2, -halfZ + TRAY_WALL_T / 2], size: [TRAY_SIZE_X, wallH, TRAY_WALL_T] },
        { pos: [halfX - TRAY_WALL_T / 2, wallH / 2, 0], size: [TRAY_WALL_T, wallH, TRAY_SIZE_Z - 2 * TRAY_WALL_T] },
        { pos: [-halfX + TRAY_WALL_T / 2, wallH / 2, 0], size: [TRAY_WALL_T, wallH, TRAY_SIZE_Z - 2 * TRAY_WALL_T] },
      ].map((w, i) => (
        <RoundedBox
          key={i}
          args={w.size as [number, number, number]}
          radius={0.015}
          smoothness={3}
          position={w.pos as [number, number, number]}
          material={wallMat}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

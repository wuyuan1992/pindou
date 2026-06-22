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
  createInstancedGlassBeadMaterial,
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

// 空间网格常量（碰撞分块用）。提到 module level 避免每帧重算，
// 也让 head/next Int32Array 可以按 TOTAL_GRID_CELLS 一次性预分配。
const CELL_SIZE = BEAD_DIAMETER;
const GRID_HALF_X = TRAY_SIZE_X / 2;
const GRID_HALF_Z = TRAY_SIZE_Z / 2;
const GRID_COLS = Math.ceil(TRAY_SIZE_X / CELL_SIZE) + 1;
const GRID_ROWS = Math.ceil(TRAY_SIZE_Z / CELL_SIZE) + 1;
const TOTAL_GRID_CELLS = GRID_COLS * GRID_ROWS;

interface TrayProps {
  onDrop?: (colorId: string) => void;
  onPick?: (colorId: string) => void;
}

interface BeadPhysics {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  colorId: string;
}

/** 复用的 dummy object，用于写入 InstancedMesh 的矩阵。 */
const _dummy = new THREE.Object3D();
const _colorObj = new THREE.Color();

export function Tray({ onDrop, onPick }: TrayProps) {
  const beads = useTrayStore((s) => s.beads);
  const add = useTrayStore((s) => s.add);
  const removeById = useTrayStore((s) => s.removeById);
  const transform = useLayoutStore((s) => s.transforms.tray);
  const dragging = useLayoutStore((s) => s.draggingItem);
  const trayPos = transform.position;
  const trayRot = transform.rotationY;

  const physicsRef = useRef<Map<string, BeadPhysics>>(new Map());
  // id -> instance index；与 physicsRef 同步维护。
  const idToIndexRef = useRef<Map<string, number>>(new Map());
  // instance index -> id，反向表，用于 pointer 事件 O(1) 反查。
  const indexToIdRef = useRef<string[]>([]);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // 碰撞空间网格的预分配缓冲。一帧只 fill/clear，不重新分配。
  const headRef = useRef<Int32Array>(new Int32Array(TOTAL_GRID_CELLS));
  const nextRef = useRef<Int32Array>(new Int32Array(MAX_TRAY_BEADS));
  // 物理遍历用的稳定并行数组，避免 Array.from(physics.entries()) 的 tuple 分配。
  const entryIdsRef = useRef<string[]>([]);
  const entryPhysRef = useRef<BeadPhysics[]>([]);

  const beadGeometry = useMemo(() => createBeadGeometry(), []);
  const instancedMaterial = useMemo(() => createInstancedGlassBeadMaterial(), []);

  // 同步 store -> physics + instance index/color。
  useEffect(() => {
    const physics = physicsRef.current;
    const idToIndex = idToIndexRef.current;
    const currentIds = new Set(beads.map((b) => b.id));
    for (const id of Array.from(physics.keys())) {
      if (!currentIds.has(id)) {
        physics.delete(id);
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
          colorId: b.colorId,
        });
      } else {
        // 颜色可能没变，但安全起见更新
        physics.get(b.id)!.colorId = b.colorId;
      }
    });

    // 重建 index 映射（保证 instance 编号紧凑）
    idToIndex.clear();
    const indexToId: string[] = [];
    let idx = 0;
    for (const b of beads) {
      idToIndex.set(b.id, idx);
      indexToId[idx] = b.id;
      idx++;
    }
    indexToIdRef.current = indexToId;

    // 同步 instance 颜色 + count
    const mesh = instancedMeshRef.current;
    if (mesh) {
      beads.forEach((b) => {
        const i = idToIndex.get(b.id);
        if (i === undefined) return;
        const color = getColor(b.colorId);
        _colorObj.set(color.base);
        mesh.setColorAt(i, _colorObj);
      });
      mesh.count = beads.length;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [beads]);

  useEffect(() => {
    return () => {
      physicsRef.current.clear();
      idToIndexRef.current.clear();
      indexToIdRef.current = [];
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

  const handleInstancedPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) return;
    if (e.button !== 0) return;
    // 右键 / 中键：让事件冒泡到 tray 触发 drop
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId === undefined) return;
    // 反查 id（O(1)）
    const targetId = indexToIdRef.current[instanceId];
    if (!targetId) return;
    if (!tryPickOne(targetId)) return;
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

    // 单次遍历：drag push + damping + integrate + walls + 构建 entries。
    // 碰撞循环基于 entries 完成后再跑；instance matrix 同步放最后，
    // 这样碰撞修正的 pos 也能在本帧反映到画面（避免豆子重叠多一帧）。
    // 顺序与原版的差异：原版是 push → 碰撞（用未 damp 的 vel）→ damping+integrate，
    // 新版是 push + damping + integrate（pos 已更新）→ 碰撞（用 damp 后的 vel）。
    // dt 单帧 ~16ms，dampFactor ≈ 0.96，差异 < 4%，视觉上无法察觉。
    const head = headRef.current;
    const next = nextRef.current;
    head.fill(-1);

    const ids = entryIdsRef.current;
    const phys = entryPhysRef.current;

    const boundHalfX = GRID_HALF_X - BEAD_DIAMETER / 2;
    const boundHalfZ = GRID_HALF_Z - BEAD_DIAMETER / 2;
    const dampFactor = Math.pow(0.5, dt * DAMPING_RATE);
    const pushR2 = PUSH_RADIUS * PUSH_RADIUS;

    let n = 0;
    physics.forEach((p, id) => {
      // 1) drag push
      if (dragPos) {
        const worldX = p.pos.x + trayPos[0];
        const worldZ = p.pos.z + trayPos[2];
        const dxW = dragPos[0] - worldX;
        const dzW = dragPos[2] - worldZ;
        const localDx = dxW * cos - dzW * sin;
        const localDz = dxW * sin + dzW * cos;
        const distSq = localDx * localDx + localDz * localDz;
        if (distSq < pushR2 && distSq > 0.0004) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / PUSH_RADIUS;
          p.vel.x += (localDx / dist) * falloff * PUSH_FORCE * dt;
          p.vel.z += (localDz / dist) * falloff * PUSH_FORCE * dt;
        }
      }

      // 2) damping
      p.vel.x *= dampFactor;
      p.vel.z *= dampFactor;

      // 3) integrate
      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;

      // 4) walls
      if (p.pos.x > boundHalfX) {
        p.pos.x = boundHalfX;
        p.vel.x = -Math.abs(p.vel.x) * WALL_RESTITUTION;
      } else if (p.pos.x < -boundHalfX) {
        p.pos.x = -boundHalfX;
        p.vel.x = Math.abs(p.vel.x) * WALL_RESTITUTION;
      }
      if (p.pos.z > boundHalfZ) {
        p.pos.z = boundHalfZ;
        p.vel.z = -Math.abs(p.vel.z) * WALL_RESTITUTION;
      } else if (p.pos.z < -boundHalfZ) {
        p.pos.z = -boundHalfZ;
        p.vel.z = Math.abs(p.vel.z) * WALL_RESTITUTION;
      }

      // 5) 写入 entries 并行数组（碰撞用）
      if (n < ids.length) {
        ids[n] = id;
        phys[n] = p;
      } else {
        ids.push(id);
        phys.push(p);
      }
      n++;
    });
    ids.length = n;
    phys.length = n;

    // 6) 空间网格分块碰撞检测（基于刚构建的 entries 数组）
    const minDist = BEAD_DIAMETER * COLLISION_SLOP;
    const minDist2 = minDist * minDist;

    if (n > 1) {
      // 计算 bead 所在格子并头插
      for (let i = 0; i < n; i++) {
        const p = phys[i];
        let gx = Math.floor((p.pos.x + GRID_HALF_X) / CELL_SIZE);
        let gz = Math.floor((p.pos.z + GRID_HALF_Z) / CELL_SIZE);
        if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
        if (gx < 0) gx = 0;
        else if (gx >= GRID_COLS) gx = GRID_COLS - 1;
        if (gz < 0) gz = 0;
        else if (gz >= GRID_ROWS) gz = GRID_ROWS - 1;
        const cellIdx = gz * GRID_COLS + gx;
        next[i] = head[cellIdx];
        head[cellIdx] = i;
      }

      // 对每个 bead，与自身格 + 8 邻居格里 idx 更大的 bead 做碰撞，
      // 用 "j > i" 去重保证每对只处理一次。3x3 邻居足以覆盖
      // BEAD_DIAMETER 格子内所有可能的近邻。
      for (let i = 0; i < n; i++) {
        const a = phys[i];
        const ap = a.pos;
        let gx = Math.floor((ap.x + GRID_HALF_X) / CELL_SIZE);
        let gz = Math.floor((ap.z + GRID_HALF_Z) / CELL_SIZE);
        if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
        if (gx < 0) gx = 0;
        else if (gx >= GRID_COLS) gx = GRID_COLS - 1;
        if (gz < 0) gz = 0;
        else if (gz >= GRID_ROWS) gz = GRID_ROWS - 1;

        for (let dz = -1; dz <= 1; dz++) {
          const nz = gz + dz;
          if (nz < 0 || nz >= GRID_ROWS) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gx + dx;
            if (nx < 0 || nx >= GRID_COLS) continue;
            const cellIdx = nz * GRID_COLS + nx;
            let j = head[cellIdx];
            while (j !== -1) {
              if (j > i) {
                const b = phys[j];
                const bp = b.pos;
                const ddx = bp.x - ap.x;
                const ddz = bp.z - ap.z;
                const distSq = ddx * ddx + ddz * ddz;
                if (distSq < minDist2 && distSq > 0.0001) {
                  const dist = Math.sqrt(distSq);
                  const overlap = (minDist - dist) / 2;
                  const nxn = ddx / dist;
                  const nzn = ddz / dist;
                  ap.x -= nxn * overlap;
                  ap.z -= nzn * overlap;
                  bp.x += nxn * overlap;
                  bp.z += nzn * overlap;
                  const relVel =
                    (b.vel.x - a.vel.x) * nxn + (b.vel.z - a.vel.z) * nzn;
                  if (relVel < 0) {
                    a.vel.x += relVel * nxn;
                    a.vel.z += relVel * nzn;
                    b.vel.x -= relVel * nxn;
                    b.vel.z -= relVel * nzn;
                  }
                }
              }
              j = next[j];
            }
          }
        }
      }
    }

    // 7) instance matrix 同步（碰撞修正过的 pos 也能在本帧反映）。
    // 遍历 entries 并行数组而非 physics，省掉 Map.entries() 迭代开销。
    const mesh = instancedMeshRef.current;
    if (mesh) {
      const idToIndex = idToIndexRef.current;
      for (let i = 0; i < n; i++) {
        const p = phys[i];
        const idx = idToIndex.get(ids[i]);
        if (idx !== undefined) {
          _dummy.position.set(p.pos.x, BEAD_HEIGHT / 2, p.pos.z);
          _dummy.rotation.set(-Math.PI / 2, 0, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          mesh.setMatrixAt(idx, _dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group
      position={trayPos}
      rotation={[0, trayRot, 0]}
      onPointerDown={handleTrayPointerDown}
      onContextMenu={handleContextMenu}
    >
      <TrayShell />
      <instancedMesh
        ref={instancedMeshRef}
        args={[beadGeometry, instancedMaterial, MAX_TRAY_BEADS]}
        // 自身保持 identity；每个 instance 的 world transform 由
        // 父 group（tray）+ setMatrixAt 的 local 矩阵合成。
        castShadow
        renderOrder={2}
        onPointerDown={handleInstancedPointerDown}
      />
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

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { PALETTE_FAMILIES, getColor } from "../data/colors.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useStackStore, STACK_SIZE } from "../store/useStackStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import {
  createBeadGeometry,
  createInstancedGlassBeadMaterial,
  createFrostedShellMaterial,
} from "./materials.ts";
import { BEAD_HEIGHT, BEAD_OUTER_R } from "./constants.ts";
import { ItemHandler } from "./Handler.tsx";

// 按色系分组，每行一族；行宽可变，整行水平居中到最长行的宽度。
const FAMILIES = PALETTE_FAMILIES;
const ROWS = FAMILIES.length;
const COLS = Math.max(...FAMILIES.map((f) => f.hexes.length));

const CELL_SIZE = 0.36;
const CELL_GAP = 0.04;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const CELL_INNER = CELL_SIZE - 0.07;
const CELL_WALL_H = 0.275;
const CELL_WALL_T = 0.025;
const TRAY_PAD = 0.2;

const TRAY_WIDTH = COLS * CELL_STEP - CELL_GAP + TRAY_PAD * 2;
const TRAY_DEPTH = ROWS * CELL_STEP - CELL_GAP + TRAY_PAD * 2;

const INITIAL_BEADS = 8;
const VISIBLE_MAX = 5;
const PUSH_RADIUS = 0.255;
const PUSH_FORCE = 5.5;
const SPRING = 22;
const DAMPING = 7;
const MAX_SPEED = 4;
const REPEAT_INTERVAL = 0.16;

// === 共享资源（module level）===
// 全部 cell 共用同一份 geometry + material，避免每 cell 各创建一份。
const SHARED_BEAD_GEOMETRY = createBeadGeometry();
const SHARED_BEAD_MATERIAL = createInstancedGlassBeadMaterial();

// 复用 dummy，写入 InstancedMesh 矩阵时使用。
const _dummy = new THREE.Object3D();
const _colorObj = new THREE.Color();

// CountBadge 数字贴图预缓存：0..INITIAL_BEADS 共 INITIAL_BEADS+1 张。
// 所有 cell 共享这组 texture，避免每次 count 变化新建 canvas。
const BADGE_TEXTURES: THREE.CanvasTexture[] = (() => {
  const arr: THREE.CanvasTexture[] = [];
  for (let n = 0; n <= INITIAL_BEADS; n++) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      arr.push(new THREE.CanvasTexture(canvas));
      continue;
    }
    ctx.fillStyle =
      n === 0 ? "rgba(120,120,120,0.85)" : "rgba(245,158,11,0.9)";
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), 32, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    arr.push(tex);
  }
  return arr;
})();

interface CellInfo {
  colorId: string;
  row: number;
  col: number;
}

interface BeadData {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

/** 单个 cell 的共享可变状态：物理粒子 + 数量。
 *  渲染由全局 InstancedMesh 完成，不再每 cell 持有 mesh refs。 */
interface SharedCell {
  colorId: string;
  cellPos: [number, number, number];
  beads: BeadData[];
  // slotBase = cellIdx * VISIBLE_MAX；instanceId = slotBase + beadIdx
  slotBase: number;
  count: number;
  hovered: boolean;
}

function buildCells(): CellInfo[] {
  const cells: CellInfo[] = [];
  for (let r = 0; r < FAMILIES.length; r++) {
    const family = FAMILIES[r];
    const offset = Math.floor((COLS - family.hexes.length) / 2);
    for (let i = 0; i < family.hexes.length; i++) {
      cells.push({ colorId: family.hexes[i], row: r, col: offset + i });
    }
  }
  return cells;
}

function cellLocalPos(row: number, col: number): [number, number, number] {
  const z = -((ROWS - 1) / 2) * CELL_STEP + row * CELL_STEP;
  const x = -((COLS - 1) / 2) * CELL_STEP + col * CELL_STEP;
  return [x, 0, z];
}

function buildBeadsTemplate(): BeadData[] {
  const arr: BeadData[] = [];
  const maxR = CELL_INNER / 2 - BEAD_OUTER_R;
  for (let i = 0; i < VISIBLE_MAX; i++) {
    const angle = (i / VISIBLE_MAX) * Math.PI * 2 + i * 0.37;
    const r = maxR * (0.4 + (i % 3) * 0.15);
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.02;
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.02;
    const v = new THREE.Vector3(x, 0, z);
    arr.push({ home: v.clone(), pos: v.clone(), vel: new THREE.Vector3() });
  }
  return arr;
}

export function PaletteTray({
  onPickBead,
}: {
  onPickBead?: (colorId: string) => void;
}) {
  const transform = useLayoutStore((s) => s.transforms.palette);
  const cells = useMemo(buildCells, []);
  const totalCells = cells.length;
  const totalInstances = totalCells * VISIBLE_MAX;

  // 顶层集中持有所有 cell 的物理粒子。
  const sharedRef = useRef<SharedCell[]>(
    cells.map((c, idx) => ({
      colorId: c.colorId,
      cellPos: cellLocalPos(c.row, c.col),
      beads: buildBeadsTemplate(),
      slotBase: idx * VISIBLE_MAX,
      count: INITIAL_BEADS,
      hovered: false,
    }))
  );

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  // 用一个 state 镜像 count/hovered，用于触发 React 重渲染 badge / ring。
  // 我们让 Cell 子组件自己持有这部分镜像 state，这里只关心 instancedMesh。
  const versionRef = useRef(0);

  // 初始化所有 instance 颜色 + count 一次（mount 后）
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;
    const shared = sharedRef.current;
    for (let ci = 0; ci < shared.length; ci++) {
      const sc = shared[ci];
      const color = getColor(sc.colorId);
      _colorObj.set(color.base);
      for (let b = 0; b < VISIBLE_MAX; b++) {
        mesh.setColorAt(sc.slotBase + b, _colorObj);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  // 唯一一个 useFrame，统一驱动所有 cell 的所有豆子物理 + InstancedMesh 同步
  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 0.033);
    const dragPos = useGrabStore.getState().dragPos;
    const paletteTransform = useLayoutStore.getState().transforms.palette;
    const cos = Math.cos(-paletteTransform.rotationY);
    const sin = Math.sin(-paletteTransform.rotationY);
    const palettePosX = paletteTransform.position[0];
    const palettePosZ = paletteTransform.position[2];
    const pushR2 = PUSH_RADIUS * PUSH_RADIUS;
    const maxR = CELL_INNER / 2 - BEAD_OUTER_R;

    const shared = sharedRef.current;
    const mesh = instancedMeshRef.current;
    const needsColorUpdate = false;

    for (let ci = 0; ci < shared.length; ci++) {
      const sc = shared[ci];
      const cellX = sc.cellPos[0];
      const cellZ = sc.cellPos[2];
      const visibleCount = Math.min(sc.count, VISIBLE_MAX);
      const beads = sc.beads;

      for (let i = 0; i < VISIBLE_MAX; i++) {
        const b = beads[i];
        const instanceId = sc.slotBase + i;
        const visible = i < visibleCount;

        if (visible) {
          if (dragPos) {
            const worldX = b.pos.x + cellX + palettePosX;
            const worldZ = b.pos.z + cellZ + palettePosZ;
            const dxW = dragPos[0] - worldX;
            const dzW = dragPos[2] - worldZ;
            const localDx = dxW * cos - dzW * sin;
            const localDz = dxW * sin + dzW * cos;
            const distSq = localDx * localDx + localDz * localDz;
            if (distSq < pushR2 && distSq > 0.0004) {
              const dist = Math.sqrt(distSq);
              const falloff = 1 - dist / PUSH_RADIUS;
              const f = falloff * PUSH_FORCE;
              b.vel.x += (localDx / dist) * f * dt;
              b.vel.z += (localDz / dist) * f * dt;
            }
          }

          b.vel.x += (b.home.x - b.pos.x) * SPRING * dt;
          b.vel.z += (b.home.z - b.pos.z) * SPRING * dt;

          b.vel.x -= b.vel.x * DAMPING * dt;
          b.vel.z -= b.vel.z * DAMPING * dt;

          const speed = Math.hypot(b.vel.x, b.vel.z);
          if (speed > MAX_SPEED) {
            b.vel.x = (b.vel.x / speed) * MAX_SPEED;
            b.vel.z = (b.vel.z / speed) * MAX_SPEED;
          }

          b.pos.x += b.vel.x * dt;
          b.pos.z += b.vel.z * dt;

          const r = Math.hypot(b.pos.x, b.pos.z);
          if (r > maxR) {
            b.pos.x = (b.pos.x / r) * maxR;
            b.pos.z = (b.pos.z / r) * maxR;
            b.vel.x *= -0.3;
            b.vel.z *= -0.3;
          }

          if (mesh) {
            // InstancedMesh 挂在顶层 group 下，不在 Cell group 内，所以
            // 矩阵里要把 cell 偏移 (cellX, cellZ) 加上，否则所有 cell 的
            // 豆子会重叠到 palette 中心。
            _dummy.position.set(b.pos.x + cellX, BEAD_HEIGHT / 2, b.pos.z + cellZ);
            _dummy.rotation.set(-Math.PI / 2, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            mesh.setMatrixAt(instanceId, _dummy.matrix);
          }
        } else {
          // 不可见 instance：缩成 0 让 GPU 跳过 fragment，但仍占 slot 以保持
          // instanceId 反查的简单映射（cellIdx * VISIBLE_MAX + beadIdx）。
          if (mesh) {
            _dummy.position.set(0, -1000, 0);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(0, 0, 0);
            _dummy.updateMatrix();
            mesh.setMatrixAt(instanceId, _dummy.matrix);
          }
        }
      }
    }

    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      if (needsColorUpdate && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  // 全局 pointer：通过 instanceId 反查 cellIdx
  const handleBeadPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (useLayoutStore.getState().draggingItem) return;
    const instanceId = e.instanceId;
    if (instanceId === undefined) return;
    const cellIdx = Math.floor(instanceId / VISIBLE_MAX);
    const shared = sharedRef.current;
    const sc = shared[cellIdx];
    if (!sc || sc.count <= 0) return;
    e.stopPropagation();

    const tryGrabOne = (): boolean => {
      if (useStackStore.getState().stack.length >= STACK_SIZE) return false;
      if (!useStackStore.getState().push(sc.colorId)) return false;
      sc.count = Math.max(0, sc.count - 1);
      versionRef.current++;
      // 触发对应 Cell 重渲染
      const trigger = cellTriggersRef.current[cellIdx];
      if (trigger) trigger((n: number) => n + 1);
      onPickBead?.(sc.colorId);
      return true;
    };

    const firstOk = tryGrabOne();
    if (!firstOk) return;

    // 移动端：单次拾取一颗，不启动 repeat。
    if (e.pointerType === "touch") return;

    let n = 0;
    const timer = setInterval(() => {
      n++;
      if (!tryGrabOne()) {
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

  // 每个 cell 注册一个 setState 函数，供全局 pointer handler 触发该 cell 重渲染。
  const cellTriggersRef = useRef<((fn: (n: number) => number) => void)[]>([]);

  return (
    <group position={transform.position} rotation={[0, transform.rotationY, 0]}>
      <TrayShell />
      <instancedMesh
        ref={instancedMeshRef}
        args={[SHARED_BEAD_GEOMETRY, SHARED_BEAD_MATERIAL, totalInstances]}
        castShadow
        renderOrder={2}
        onPointerDown={handleBeadPointerDown}
      />
      {sharedRef.current.map((sc, idx) => (
        <Cell
          key={sc.colorId}
          shared={sc}
          registerTrigger={(fn) => {
            cellTriggersRef.current[idx] = fn;
          }}
        />
      ))}
      <ItemHandler
        itemKey="palette"
        side="bottom"
        offset={[0, 0.2, TRAY_DEPTH / 2 + 0.09]}
        length={TRAY_WIDTH - 0.15}
      />
    </group>
  );
}

function Cell({
  shared,
  registerTrigger,
}: {
  shared: SharedCell;
  registerTrigger: (fn: (fn: (n: number) => number) => void) => void;
}) {
  const { colorId, cellPos } = shared;

  // 局部 state 镜像 count + hovered，触发 React 重渲染 badge / ring
  const [count, setCount] = useState(shared.count);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    shared.count = count;
  }, [count, shared]);
  useEffect(() => {
    shared.hovered = hovered;
  }, [hovered, shared]);

  // 把 setCount 注册到 parent，让全局 pointer handler 能触发本 cell 更新
  useEffect(() => {
    registerTrigger(setCount);
  }, [registerTrigger]);

  const empty = count === 0;

  return (
    <group
      position={cellPos}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <CellShell hex={colorId} />
      {hovered && !empty && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL_SIZE / 2 - 0.02, CELL_SIZE / 2, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
        </mesh>
      )}
      {empty && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL_SIZE / 2 - 0.02, CELL_SIZE / 2, 32]} />
          <meshBasicMaterial color="#9ca3af" transparent opacity={0.4} />
        </mesh>
      )}
      <CountBadge count={count} />
    </group>
  );
}

function CellShell({ hex }: { hex: string }) {
  const half = CELL_SIZE / 2;
  const wallH = CELL_WALL_H;
  const floorMat = useMemo(() => createFrostedShellMaterial(hex), [hex]);
  const wallMat = useMemo(() => createFrostedShellMaterial(hex), [hex]);

  return (
    <group>
      <RoundedBox
        args={[CELL_SIZE, 0.04, CELL_SIZE]}
        radius={0.02}
        smoothness={4}
        position={[0, 0.02, 0]}
        material={floorMat}
        receiveShadow
      />
      {[
        { pos: [0, wallH / 2, half - CELL_WALL_T / 2], size: [CELL_SIZE, wallH, CELL_WALL_T] },
        { pos: [0, wallH / 2, -half + CELL_WALL_T / 2], size: [CELL_SIZE, wallH, CELL_WALL_T] },
        { pos: [half - CELL_WALL_T / 2, wallH / 2, 0], size: [CELL_WALL_T, wallH, CELL_SIZE - 2 * CELL_WALL_T] },
        { pos: [-half + CELL_WALL_T / 2, wallH / 2, 0], size: [CELL_WALL_T, wallH, CELL_SIZE - 2 * CELL_WALL_T] },
      ].map((w, i) => (
        <RoundedBox
          key={i}
          args={w.size as [number, number, number]}
          radius={0.0125}
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

function TrayShell() {
  const floorMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#f1ead8"),
        transmission: 0.5,
        thickness: 0.5,
        roughness: 0.24,
        ior: 1.4,
        clearcoat: 0.9,
        clearcoatRoughness: 0.2,
        attenuationColor: new THREE.Color("#e6d9b8"),
        attenuationDistance: 2,
        envMapIntensity: 1.0,
        transparent: true,
      }),
    []
  );
  const wallMat = useMemo(
    () => createFrostedShellMaterial("#f3ebd6"),
    []
  );

  return (
    <group>
      <RoundedBox
        args={[TRAY_WIDTH, 0.06, TRAY_DEPTH]}
        radius={0.04}
        smoothness={5}
        position={[0, -0.01, 0]}
        material={floorMat}
        receiveShadow
        castShadow
      />
      {[
        { pos: [0, 0.125, TRAY_DEPTH / 2 - 0.025], size: [TRAY_WIDTH, 0.25, 0.05] },
        { pos: [0, 0.125, -TRAY_DEPTH / 2 + 0.025], size: [TRAY_WIDTH, 0.25, 0.05] },
        { pos: [TRAY_WIDTH / 2 - 0.025, 0.125, 0], size: [0.05, 0.25, TRAY_DEPTH - 0.1] },
        { pos: [-TRAY_WIDTH / 2 + 0.025, 0.125, 0], size: [0.05, 0.25, TRAY_DEPTH - 0.1] },
      ].map((w, i) => (
        <RoundedBox
          key={i}
          args={w.size as [number, number, number]}
          radius={0.02}
          smoothness={4}
          position={w.pos as [number, number, number]}
          material={wallMat}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

function CountBadge({ count }: { count: number }) {
  const tex = BADGE_TEXTURES[count] ?? BADGE_TEXTURES[0];
  return (
    <sprite position={[0, CELL_WALL_H + 0.15, 0]} scale={[0.25, 0.25, 1]}>
      <spriteMaterial map={tex} depthTest={false} transparent />
    </sprite>
  );
}

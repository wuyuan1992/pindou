import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, COLOR_GROUPS } from "../data/colors.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useStackStore, STACK_SIZE } from "../store/useStackStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import {
  createBeadGeometry,
  createGlassBeadMaterial,
  createFrostedShellMaterial,
} from "./materials.ts";
import { BEAD_HEIGHT } from "./constants.ts";
import { ItemHandler } from "./Handler.tsx";

const ROWS = COLOR_GROUPS.length;
const COLS = 8;
const CELL_SIZE = 1.05;
const CELL_GAP = 0.18;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const CELL_INNER = CELL_SIZE - 0.14;
const CELL_WALL_H = 0.55;
const CELL_WALL_T = 0.05;
const SECTION_GAP = 0.5;
const TRAY_PAD = 0.4;

const TRAY_WIDTH = COLS * CELL_STEP - CELL_GAP + TRAY_PAD * 2;
const TRAY_DEPTH = ROWS * (CELL_STEP - CELL_GAP + SECTION_GAP) - SECTION_GAP + TRAY_PAD * 2;

const INITIAL_BEADS = 10;
const VISIBLE_MAX = 7;
const PUSH_RADIUS = 0.55;
const PUSH_FORCE = 5.5;
const SPRING = 22;
const DAMPING = 7;
const MAX_SPEED = 4;
const REPEAT_INTERVAL = 0.16;

const SECTION_TINTS: Record<string, string> = {
  红粉: "#f9dde2",
  橙黄: "#f9e6c5",
  绿青: "#dcefe0",
  蓝紫: "#dde6f4",
  中性: "#eee9dc",
};

interface CellInfo {
  colorId: string;
  row: number;
  col: number;
  tint: string;
}

interface BeadData {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

function buildCells(): CellInfo[] {
  const cells: CellInfo[] = [];
  COLOR_GROUPS.forEach((g, rowIdx) => {
    const tint = SECTION_TINTS[g.name] ?? "#eee9dc";
    g.slugs.forEach((slug, colIdx) => {
      const c = COLORS.find((cc) => cc.slug === slug);
      if (c) cells.push({ colorId: c.id, row: rowIdx, col: colIdx, tint });
    });
  });
  return cells;
}

function cellLocalPos(row: number, col: number): [number, number, number] {
  const z = -((ROWS - 1) / 2) * (CELL_STEP + SECTION_GAP - CELL_GAP) + row * (CELL_STEP + SECTION_GAP - CELL_GAP);
  const x = -((COLS - 1) / 2) * CELL_STEP + col * CELL_STEP;
  return [x, 0, z];
}

export function PaletteTray({
  onPickBead,
}: {
  onPickBead?: (colorId: string) => void;
}) {
  const transform = useLayoutStore((s) => s.transforms.palette);
  const cells = useMemo(buildCells, []);

  return (
    <group position={transform.position} rotation={[0, transform.rotationY, 0]}>
      <TrayShell />
      {cells.map((cell) => (
        <Cell
          key={cell.colorId}
          colorId={cell.colorId}
          row={cell.row}
          col={cell.col}
          tint={cell.tint}
          onPickBead={onPickBead}
        />
      ))}
      <ItemHandler
        itemKey="palette"
        side="bottom"
        offset={[0, 0.4, TRAY_DEPTH / 2 + 0.18]}
        length={TRAY_WIDTH - 0.3}
      />
    </group>
  );
}

function Cell({
  colorId,
  row,
  col,
  tint,
  onPickBead,
}: {
  colorId: string;
  row: number;
  col: number;
  tint: string;
  onPickBead?: (colorId: string) => void;
}) {
  const colorDef = useMemo(() => COLORS.find((c) => c.id === colorId), [colorId]);
  const [pos] = useState(() => cellLocalPos(row, col));

  const geometry = useMemo(() => createBeadGeometry(), []);
  const material = useMemo(
    () => createGlassBeadMaterial(colorDef?.base ?? "#ffffff"),
    [colorDef]
  );

  const [count, setCount] = useState(INITIAL_BEADS);

  const beadsTemplate = useMemo<BeadData[]>(() => {
    const arr: BeadData[] = [];
    for (let i = 0; i < VISIBLE_MAX; i++) {
      const angle = (i / VISIBLE_MAX) * Math.PI * 2 + i * 0.37;
      const r = 0.18 + (i % 3) * 0.05;
      const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.1;
      const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.1;
      const v = new THREE.Vector3(x, 0, z);
      arr.push({ home: v.clone(), pos: v.clone(), vel: new THREE.Vector3() });
    }
    return arr;
  }, []);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const [hovered, setHovered] = useState(false);
  const visibleCount = Math.min(count, VISIBLE_MAX);

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 0.033);
    const dragPos = useGrabStore.getState().dragPos;

    for (let i = 0; i < visibleCount; i++) {
      const b = beadsTemplate[i];

      if (dragPos) {
        const paletteTransform = useLayoutStore.getState().transforms.palette;
        const cos = Math.cos(-paletteTransform.rotationY);
        const sin = Math.sin(-paletteTransform.rotationY);
        const worldX = b.pos.x + pos[0] + paletteTransform.position[0];
        const worldZ = b.pos.z + pos[2] + paletteTransform.position[2];
        const dxW = dragPos[0] - worldX;
        const dzW = dragPos[2] - worldZ;
        const localDx = dxW * cos - dzW * sin;
        const localDz = dxW * sin + dzW * cos;
        const distSq = localDx * localDx + localDz * localDz;
        if (distSq < PUSH_RADIUS * PUSH_RADIUS && distSq > 0.0004) {
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

      const maxR = CELL_INNER / 2 - 0.42;
      const r = Math.hypot(b.pos.x, b.pos.z);
      if (r > maxR) {
        b.pos.x = (b.pos.x / r) * maxR;
        b.pos.z = (b.pos.z / r) * maxR;
        b.vel.x *= -0.3;
        b.vel.z *= -0.3;
      }

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.set(b.pos.x, BEAD_HEIGHT / 2, b.pos.z);
      }
    }
  });

  useEffect(() => {
    return () => {
      meshRefs.current = [];
    };
  }, []);

  const tryGrabOne = (): boolean => {
    if (count <= 0) return false;
    if (useStackStore.getState().stack.length >= STACK_SIZE) return false;
    if (!useStackStore.getState().push(colorId)) return false;
    setCount((c) => Math.max(0, c - 1));
    onPickBead?.(colorId);
    return true;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (useLayoutStore.getState().draggingItem) return;
    e.stopPropagation();
    const firstOk = tryGrabOne();
    if (!firstOk) return;

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

  const empty = count === 0;

  return (
    <group position={pos}>
      <CellShell tint={tint} />
      {beadsTemplate.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={geometry}
          material={material}
          position={[b.pos.x, BEAD_HEIGHT / 2, b.pos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          renderOrder={2}
          visible={i < visibleCount}
          onPointerDown={handlePointerDown}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
        />
      ))}
      {hovered && !empty && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL_SIZE / 2 - 0.04, CELL_SIZE / 2, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
        </mesh>
      )}
      {empty && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CELL_SIZE / 2 - 0.04, CELL_SIZE / 2, 32]} />
          <meshBasicMaterial color="#9ca3af" transparent opacity={0.4} />
        </mesh>
      )}
      <CountBadge count={count} />
    </group>
  );
}

function CellShell({ tint }: { tint: string }) {
  const half = CELL_SIZE / 2;
  const wallH = CELL_WALL_H;
  const floorMat = useMemo(() => createFrostedShellMaterial(tint), [tint]);
  const wallMat = useMemo(() => createFrostedShellMaterial(tint), [tint]);

  return (
    <group>
      <RoundedBox
        args={[CELL_SIZE, 0.08, CELL_SIZE]}
        radius={0.04}
        smoothness={4}
        position={[0, 0.04, 0]}
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
          radius={0.025}
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
        thickness: 1.0,
        roughness: 0.24,
        ior: 1.4,
        clearcoat: 0.9,
        clearcoatRoughness: 0.2,
        attenuationColor: new THREE.Color("#e6d9b8"),
        attenuationDistance: 4,
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
        args={[TRAY_WIDTH, 0.12, TRAY_DEPTH]}
        radius={0.08}
        smoothness={5}
        position={[0, -0.02, 0]}
        material={floorMat}
        receiveShadow
        castShadow
      />
      {[
        { pos: [0, 0.25, TRAY_DEPTH / 2 - 0.05], size: [TRAY_WIDTH, 0.5, 0.1] },
        { pos: [0, 0.25, -TRAY_DEPTH / 2 + 0.05], size: [TRAY_WIDTH, 0.5, 0.1] },
        { pos: [TRAY_WIDTH / 2 - 0.05, 0.25, 0], size: [0.1, 0.5, TRAY_DEPTH - 0.2] },
        { pos: [-TRAY_WIDTH / 2 + 0.05, 0.25, 0], size: [0.1, 0.5, TRAY_DEPTH - 0.2] },
      ].map((w, i) => (
        <RoundedBox
          key={i}
          args={w.size as [number, number, number]}
          radius={0.04}
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
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = count === 0 ? "rgba(120,120,120,0.85)" : "rgba(245,158,11,0.9)";
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(count), 32, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [count]);

  if (!texture) return null;

  return (
    <sprite ref={spriteRef} position={[0, CELL_WALL_H + 0.3, 0]} scale={[0.5, 0.5, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

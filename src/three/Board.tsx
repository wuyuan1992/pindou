import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Instances, Instance, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import type { PointerType } from "../types.ts";
import {
  BOARD_N,
  BOARD_SIZE,
  BOARD_THICKNESS,
  BOARD_TOP_Y,
  CELL,
  PEG_HEIGHT,
  PEG_RADIUS,
  worldToLocal,
} from "./constants.ts";
import { createBoardMaterial, createGlassMaterial } from "./materials.ts";
import { ItemHandler } from "./Handler.tsx";
import { Beads } from "./Beads.tsx";

const BOARD_SLAB = BOARD_SIZE + 0.3;

interface BoardProps {
  onPlace?: (colorId: string) => void;
  onPick?: (colorId: string) => void;
  onErase?: () => void;
}

// peg 顶部高度(用户视觉看到的「peg 圆面」)
// 用 peg 顶部而非中心:豆子最终会落到 BOARD_TOP_Y + PEG_HEIGHT/2 的 peg 中心,
// 但用户点击时视觉对齐的是 peg 顶部圆面。两者 x/z 一致(peg 是竖直的),
// 取顶部高度是为了让 ray-plane 求得的交点 x/z 与「视觉 peg 中心」一致。
const PEG_TOP_Y = BOARD_TOP_Y + PEG_HEIGHT;
const pegTopPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  -PEG_TOP_Y
);
const hitOnPegTop = new THREE.Vector3();

function rayToIdx(ray: THREE.Ray): number | null {
  const bt = useLayoutStore.getState().transforms.board;
  const hit = ray.intersectPlane(pegTopPlane, hitOnPegTop);
  if (!hit) return null;
  const [lx, lz] = worldToLocal(bt, hit.x, hit.z);
  const half = (BOARD_N - 1) / 2;
  const col = Math.round(lx / CELL + half);
  const row = Math.round(lz / CELL + half);
  if (col < 0 || col >= BOARD_N || row < 0 || row >= BOARD_N) return null;
  return row * BOARD_N + col;
}

export function Board({ onPlace, onPick, onErase }: BoardProps) {
  const boardMaterial = useMemo(() => createBoardMaterial(), []);
  const pegMaterial = useMemo(() => createGlassMaterial(), []);

  const pegs = useMemo(() => {
    const arr: { pos: [number, number, number]; key: number }[] = [];
    const half = (BOARD_N - 1) / 2;
    for (let row = 0; row < BOARD_N; row++) {
      for (let col = 0; col < BOARD_N; col++) {
        const x = (col - half) * CELL;
        const z = (row - half) * CELL;
        arr.push({
          pos: [x, BOARD_TOP_Y + PEG_HEIGHT / 2, z],
          key: row * BOARD_N + col,
        });
      }
    }
    return arr;
  }, []);

  const prepareTimerRef = useRef<number | undefined>(undefined);
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number; idx: number } | null>(null);

  const clearLongPressTimers = () => {
    if (prepareTimerRef.current !== undefined) {
      clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = undefined;
    }
    if (longPressTimerRef.current !== undefined) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };

  useEffect(() => {
    const finish = () => {
      const s = useBeadStore.getState();
      clearLongPressTimers();
      touchStartRef.current = null;
      if (s.strokeSnapshot) {
        s.endStroke();
        s.setMode("idle");
      }
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  // 两指 tap:正常模式撤销,Preview 模式退出 Preview(v3.1 §14.6)
  useEffect(() => {
    const activePointers = new Set<number>();
    let twoFingerStart: { x: number; y: number; time: number } | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      activePointers.add(e.pointerId);
      if (activePointers.size === 2) {
        twoFingerStart = { x: e.clientX, y: e.clientY, time: Date.now() };
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const wasTwo = activePointers.size >= 2;
      activePointers.delete(e.pointerId);
      if (wasTwo && twoFingerStart && activePointers.size === 0) {
        const elapsed = Date.now() - twoFingerStart.time;
        const dx = e.clientX - twoFingerStart.x;
        const dy = e.clientY - twoFingerStart.y;
        if (elapsed < 300 && dx * dx + dy * dy < 25 * 25) {
          const ls = useLayoutStore.getState();
          if (ls.previewMode) {
            ls.togglePreview();
          } else {
            useBeadStore.getState().undo();
          }
        }
        twoFingerStart = null;
      }
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const handlePrimaryDown = (e: ThreeEvent<PointerEvent>) => {
    if (useLayoutStore.getState().draggingItem) return;
    if (useLayoutStore.getState().previewMode) return;
    e.stopPropagation();

    const s = useBeadStore.getState();
    s.setPointerType(e.pointerType as PointerType);

    const idx = rayToIdx(e.ray);
    if (idx === null) return;

    const native = e.nativeEvent as PointerEvent;
    const { button, shiftKey, altKey } = native;
    const isMouse = e.pointerType === "mouse";

    if (!isMouse) {
      if (!native.isPrimary) return;
      handleTouchStart(native, idx, s);
      return;
    }

    if (altKey && button === 0) {
      if (s.grid[idx]) {
        s.pickColor(idx);
        onPick?.(s.grid[idx]!);
      }
      return;
    }

    const wantErase =
      button === 2 || (button === 0 && shiftKey) || (button === 0 && s.eraserToggle);

    if (wantErase) {
      if (s.grid[idx] === null) return;
      s.setMode("erasing");
      s.beginStroke();
      s.eraseAt(idx);
      onErase?.();
      return;
    }

    if (button === 0) {
      s.setMode("placing");
      s.beginStroke();
      s.paintAt(idx);
      onPlace?.(s.currentColorId);
    }
  };

  const handleTouchStart = (
    native: PointerEvent,
    idx: number,
    s: ReturnType<typeof useBeadStore.getState>
  ) => {
    const wantErase = s.eraserToggle;
    if (wantErase) {
      if (s.grid[idx] === null) return;
      s.setMode("erasing");
      s.beginStroke();
      s.eraseAt(idx);
      onErase?.();
      return;
    }

    s.setMode("placing");
    s.beginStroke();
    s.paintAt(idx);
    onPlace?.(s.currentColorId);

    touchStartRef.current = { x: native.clientX, y: native.clientY, idx };

    prepareTimerRef.current = window.setTimeout(() => {
      const cur = useBeadStore.getState();
      if ((cur.mode === "placing" || cur.mode === "painting") && touchStartRef.current?.idx === idx) {
        cur.setMode("long_pressing");
      }
    }, 200);

    longPressTimerRef.current = window.setTimeout(() => {
      const cur = useBeadStore.getState();
      if (cur.mode === "long_pressing" && touchStartRef.current?.idx === idx) {
        cur.endStroke();
        cur.undo();
        const color = cur.grid[idx];
        if (color) {
          cur.pickColor(idx);
          onPick?.(color);
        }
        cur.setMode("idle");
        touchStartRef.current = null;
      }
    }, 400);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const s = useBeadStore.getState();
    if (!s.strokeSnapshot) return;
    if (s.mode !== "placing" && s.mode !== "painting" && s.mode !== "erasing" && s.mode !== "long_pressing") return;

    const idx = rayToIdx(e.ray);
    if (idx === null) return;

    if (e.pointerType !== "mouse" && touchStartRef.current) {
      const native = e.nativeEvent as PointerEvent;
      const dx = native.clientX - touchStartRef.current.x;
      const dy = native.clientY - touchStartRef.current.y;
      if (dx * dx + dy * dy > 4) {
        clearLongPressTimers();
        if (s.mode === "long_pressing") s.setMode("painting");
      }
    }

    if (s.mode === "long_pressing") return;

    if (s.mode === "placing") s.setMode("painting");

    if (s.mode === "erasing") {
      if (s.grid[idx] !== null) {
        s.eraseAt(idx);
        onErase?.();
      }
    } else {
      if (s.grid[idx] !== s.currentColorId) {
        s.paintAt(idx);
        onPlace?.(s.currentColorId);
      }
    }
  };

  const handleDoubleClick = (e: ThreeEvent<PointerEvent>) => {
    if (useLayoutStore.getState().previewMode) return;
    if (e.pointerType !== "mouse") return;
    const idx = rayToIdx(e.ray);
    if (idx === null) return;
    const s = useBeadStore.getState();
    if (s.grid[idx]) {
      s.pickColor(idx);
      onPick?.(s.grid[idx]!);
    }
  };

  const handleContextMenu = (e: ThreeEvent<PointerEvent>) => {
    e.nativeEvent.preventDefault();
    e.stopPropagation();
  };

  return (
    <group>
      <RoundedBox
        args={[BOARD_SLAB, BOARD_THICKNESS, BOARD_SLAB]}
        radius={0.12}
        smoothness={3}
        position={[0, 0, 0]}
        receiveShadow
        castShadow
        onPointerDown={handlePrimaryDown}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <primitive object={boardMaterial} attach="material" />
      </RoundedBox>

      <Instances
        limit={BOARD_N * BOARD_N}
        range={BOARD_N * BOARD_N}
        castShadow
        material={pegMaterial}
      >
        <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS * 0.85, PEG_HEIGHT, 8]} />
        {pegs.map((p) => (
          <Instance key={p.key} position={p.pos} />
        ))}
      </Instances>

      <ItemHandler
        itemKey="board"
        side="bottom"
        offset={[0, 0.25, BOARD_SLAB / 2 + 0.09]}
        length={BOARD_SLAB - 0.15}
        onDoubleClick={() => useLayoutStore.getState().togglePreview()}
      />
    </group>
  );
}

export type { BoardProps };

const MAX_TILT = 0.22;
const TILT_GAIN = 0.022;
const TILT_LERP = 0.12;
const PREVIEW_LIFT = 2;
const LIFT_LERP = 0.1;

interface BoardClusterProps {
  onPlace?: (colorId: string) => void;
  onPick?: (colorId: string) => void;
  onErase?: () => void;
}

export function BoardCluster({ onPlace, onPick, onErase }: BoardClusterProps) {
  const boardTransform = useLayoutStore((s) => s.transforms.board);
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tablePlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );
  const hitTarget = useMemo(() => new THREE.Vector3(), []);

  const groupRef = useRef<THREE.Group>(null);
  const tilt = useRef({ x: 0, z: 0 });
  const targetTilt = useRef({ x: 0, z: 0 });
  const lift = useRef(0);
  const targetLift = useRef(0);

  useFrame(() => {
    const layoutState = useLayoutStore.getState();
    const inPreview = layoutState.previewMode;
    const bt = layoutState.transforms.board;

    targetLift.current = inPreview ? PREVIEW_LIFT : 0;
    if (inPreview) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(tablePlane, hitTarget);
      if (hit) {
        const [lx, lz] = worldToLocal(bt, hit.x, hit.z);
        targetTilt.current.x = THREE.MathUtils.clamp(lz * TILT_GAIN, -MAX_TILT, MAX_TILT);
        targetTilt.current.z = THREE.MathUtils.clamp(-lx * TILT_GAIN, -MAX_TILT, MAX_TILT);
      }
    } else {
      targetTilt.current.x = 0;
      targetTilt.current.z = 0;
    }
    tilt.current.x += (targetTilt.current.x - tilt.current.x) * TILT_LERP;
    tilt.current.z += (targetTilt.current.z - tilt.current.z) * TILT_LERP;
    lift.current += (targetLift.current - lift.current) * LIFT_LERP;

    const settled =
      !inPreview &&
      Math.abs(tilt.current.x) < 1e-4 &&
      Math.abs(tilt.current.z) < 1e-4 &&
      Math.abs(lift.current) < 1e-4 &&
      Math.abs(targetTilt.current.x) < 1e-4 &&
      Math.abs(targetTilt.current.z) < 1e-4 &&
      Math.abs(targetLift.current) < 1e-4;
    const group = groupRef.current;
    if (settled) {
      tilt.current.x = 0;
      tilt.current.z = 0;
      lift.current = 0;
      if (group) {
        group.position.set(bt.position[0], bt.position[1], bt.position[2]);
        group.rotation.x = 0;
        group.rotation.z = 0;
      }
      return;
    }

    if (group) {
      group.position.set(bt.position[0], bt.position[1] + lift.current, bt.position[2]);
      group.rotation.x = tilt.current.x;
      group.rotation.z = tilt.current.z;
    }
  });

  return (
    <group
      ref={groupRef}
      position={boardTransform.position}
      rotation={[0, boardTransform.rotationY, 0]}
    >
      <Board onPlace={onPlace} onPick={onPick} onErase={onErase} />
      <Beads />
    </group>
  );
}

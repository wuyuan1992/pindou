import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Instances, Instance, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useStackStore } from "../store/useStackStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import {
  BOARD_N,
  BOARD_SIZE,
  BOARD_THICKNESS,
  BOARD_TOP_Y,
  PEG_HEIGHT,
  PEG_RADIUS,
  worldToLocal,
} from "./constants.ts";
import { createBoardMaterial, createGlassMaterial } from "./materials.ts";
import { ItemHandler } from "./Handler.tsx";
import { Beads } from "./Beads.tsx";

const BOARD_SLAB = BOARD_SIZE + 0.6;
const REPEAT_INTERVAL = 0.16;

interface BoardProps {
  onPlace?: (colorId: string) => void;
  onPick?: (colorId: string) => void;
  onErase?: () => void;
}

export function Board({ onPlace, onPick, onErase }: BoardProps) {
  const placeBead = useBeadStore((s) => s.placeBead);
  const removeBead = useBeadStore((s) => s.removeBead);
  const boardMaterial = useMemo(() => createBoardMaterial(), []);
  const pegMaterial = useMemo(() => createGlassMaterial(), []);

  const pegs = useMemo(() => {
    const arr: { pos: [number, number, number]; key: number }[] = [];
    for (let row = 0; row < BOARD_N; row++) {
      for (let col = 0; col < BOARD_N; col++) {
        const x = col - (BOARD_N - 1) / 2;
        const z = row - (BOARD_N - 1) / 2;
        arr.push({
          pos: [x, BOARD_TOP_Y + PEG_HEIGHT / 2, z],
          key: row * BOARD_N + col,
        });
      }
    }
    return arr;
  }, []);

  const tryPick = () => {
    const hovered = useGrabStore.getState().hoveredIdx;
    if (hovered === null) return false;
    const existing = useBeadStore.getState().grid[hovered];
    if (!existing) return false;
    if (!useStackStore.getState().push(existing)) return false;
    if (!removeBead(hovered)) {
      useStackStore.getState().pop();
      return false;
    }
    onPick?.(existing);
    return true;
  };

  const tryPlace = () => {
    const hovered = useGrabStore.getState().hoveredIdx;
    if (hovered === null) return false;
    if (useBeadStore.getState().grid[hovered]) return false;
    const colorId = useStackStore.getState().pop();
    if (!colorId) return false;
    if (!placeBead(hovered, colorId)) {
      useStackStore.getState().push(colorId);
      return false;
    }
    onPlace?.(colorId);
    return true;
  };

  const tryEraseOne = () => {
    if (useStackStore.getState().stack.length > 0) {
      if (useStackStore.getState().pop()) {
        onErase?.();
        return true;
      }
    }
    const hovered = useGrabStore.getState().hoveredIdx;
    if (hovered === null) return false;
    if (useBeadStore.getState().grid[hovered]) {
      if (removeBead(hovered)) {
        onErase?.();
        return true;
      }
    }
    return false;
  };

  const handlePrimaryDown = (e: any) => {
    if (useLayoutStore.getState().draggingItem) return;
    if (useLayoutStore.getState().previewMode) return;
    e.stopPropagation?.();
    const existing =
      useGrabStore.getState().hoveredIdx !== null
        ? useBeadStore.getState().grid[useGrabStore.getState().hoveredIdx!]
        : null;
    const firstOk = existing ? tryPick() : tryPlace();
    if (!firstOk) return;

    let count = 0;
    const timer = setInterval(() => {
      count++;
      const ok = existing ? tryPick() : tryPlace();
      if (!ok) {
        clearInterval(timer);
        return;
      }
      if (count > 30) clearInterval(timer);
    }, REPEAT_INTERVAL * 1000);

    const cancel = () => {
      clearInterval(timer);
      window.removeEventListener("pointerup", cancel);
    };
    window.addEventListener("pointerup", cancel);
  };

  const handleContextMenu = (e: any) => {
    e.stopPropagation?.();
    tryEraseOne();
  };

  return (
    <group>
      <RoundedBox
        args={[BOARD_SLAB, BOARD_THICKNESS, BOARD_SLAB]}
        radius={0.12}
        smoothness={4}
        position={[0, 0, 0]}
        receiveShadow
        castShadow
        onPointerDown={handlePrimaryDown}
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
        <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS * 0.85, PEG_HEIGHT, 20]} />
        {pegs.map((p) => (
          <Instance key={p.key} position={p.pos} />
        ))}
      </Instances>

      <ItemHandler
        itemKey="board"
        side="bottom"
        offset={[0, 0.5, BOARD_SLAB / 2 + 0.18]}
        length={BOARD_SLAB - 0.3}
        onDoubleClick={() => useLayoutStore.getState().togglePreview()}
      />
    </group>
  );
}

export type { BoardProps };

const MAX_TILT = 0.22;
const TILT_GAIN = 0.022;
const TILT_LERP = 0.12;
const PREVIEW_LIFT = 4;
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
    const inPreview = useLayoutStore.getState().previewMode;
    targetLift.current = inPreview ? PREVIEW_LIFT : 0;
    if (inPreview) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(tablePlane, hitTarget);
      if (hit) {
        const bt = useLayoutStore.getState().transforms.board;
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
    if (groupRef.current) {
      const bt = useLayoutStore.getState().transforms.board;
      groupRef.current.position.set(bt.position[0], bt.position[1] + lift.current, bt.position[2]);
      groupRef.current.rotation.x = tilt.current.x;
      groupRef.current.rotation.z = tilt.current.z;
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

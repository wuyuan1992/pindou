import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useStackStore } from "../store/useStackStore.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { getColor } from "../data/colors.ts";
import { createBeadGeometry, createGlassBeadMaterial } from "./materials.ts";
import { BOARD_N, CELL, localToWorld } from "./constants.ts";
import { Tweezers } from "./Tweezers.tsx";

const HALF = (BOARD_N - 1) / 2;
const BEAD_SPACING_Y = 0.65;

export function FloatingBead() {
  // 只订阅 stack（变化少，需要触发 React 重渲染以重建 mesh 列表）。
  // dragPos / hoveredIdx / boardTransform / draggingItem / hoveringHandler / previewMode
  // 全部走 useFrame + getState()，避免 pointermove 每帧重渲染整棵子树。
  const stack = useStackStore((s) => s.stack);

  const groupRef = useRef<Group>(null);

  const geometry = useMemo(() => createBeadGeometry(), []);
  const materialCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof createGlassBeadMaterial>>();
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

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const { dragPos, hoveredIdx } = useGrabStore.getState();
    const { transforms, draggingItem, hoveringHandler, previewMode } =
      useLayoutStore.getState();

    // 隐藏条件：原本是提前 return null 的四个分支，统一迁到 visible 控制。
    const shouldHide =
      !dragPos || !!draggingItem || hoveringHandler || previewMode;

    if (shouldHide) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const boardTransform = transforms.board;
    const snapped = hoveredIdx !== null;
    const col = hoveredIdx !== null ? hoveredIdx % BOARD_N : 0;
    const row = hoveredIdx !== null ? Math.floor(hoveredIdx / BOARD_N) : 0;
    const [snappedX, snappedZ] = localToWorld(
      boardTransform,
      (col - HALF) * CELL,
      (row - HALF) * CELL
    );
    const baseX = snapped ? snappedX : dragPos[0];
    const baseZ = snapped ? snappedZ : dragPos[2];
    const baseY = dragPos[1];

    group.position.set(baseX, baseY, baseZ);
    group.rotation.y = boardTransform.rotationY;
  });

  return (
    <group ref={groupRef} visible={false}>
      <Tweezers />
      {stack.map((colorId, i) => {
        const offsetFromTop = stack.length - 1 - i;
        const y = offsetFromTop * BEAD_SPACING_Y;
        return (
          <mesh
            key={`${colorId}-${i}`}
            geometry={geometry}
            material={materialCache(colorId)}
            position={[0, y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            renderOrder={2}
            raycast={() => {}}
          />
        );
      })}
    </group>
  );
}

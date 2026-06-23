import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useBeadStore } from "../store/useBeadStore.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { useIsMobile } from "../hooks/useMediaQuery.ts";
import { getColor } from "../data/colors.ts";
import { createBeadGeometry, createGlassBeadMaterial } from "./materials.ts";
import { BOARD_N, CELL, localToWorld } from "./constants.ts";

const HALF = (BOARD_N - 1) / 2;
const MOBILE_Y_OFFSET = 1.2;

export function FloatingBead() {
  const currentColorId = useBeadStore((s) => s.currentColorId);
  const mode = useBeadStore((s) => s.mode);
  const isMobile = useIsMobile();

  const groupRef = useRef<Group>(null);
  const geometry = useMemo(() => createBeadGeometry(), []);
  const material = useMemo(
    () => createGlassBeadMaterial(getColor(currentColorId).base),
    [currentColorId]
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const grab = useGrabStore.getState();
    const layout = useLayoutStore.getState();

    const shouldHide = !grab.dragPos || !!layout.draggingItem || layout.hoveringHandler || layout.previewMode;
    if (shouldHide) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const boardTransform = layout.transforms.board;
    const hoveredIdx = grab.hoveredIdx;
    const snapped = hoveredIdx !== null;
    const col = hoveredIdx !== null ? hoveredIdx % BOARD_N : 0;
    const row = hoveredIdx !== null ? Math.floor(hoveredIdx / BOARD_N) : 0;
    const [snappedX, snappedZ] = localToWorld(boardTransform, (col - HALF) * CELL, (row - HALF) * CELL);
    const dragPos = grab.dragPos!;
    const baseX = snapped ? snappedX : dragPos[0];
    const baseZ = snapped ? snappedZ : dragPos[2];
    const baseY = dragPos[1] + (isMobile ? MOBILE_Y_OFFSET : 0);

    group.position.set(baseX, baseY, baseZ);
    group.rotation.y = boardTransform.rotationY;
  });

  const isErasing = mode === "erasing";
  const ghostOpacity = isErasing ? 0.0 : 0.55;

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        renderOrder={2}
      />
      <mesh visible={isErasing}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.7} />
      </mesh>
      <mesh visible={!isErasing}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={ghostOpacity} />
      </mesh>
    </group>
  );
}

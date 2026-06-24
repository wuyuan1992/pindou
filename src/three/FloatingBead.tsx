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
  const isMobile = useIsMobile();

  const groupRef = useRef<Group>(null);
  const geometry = useMemo(() => createBeadGeometry(), []);
  const material = useMemo(
    () => createGlassBeadMaterial(getColor(currentColorId).base),
    [currentColorId]
  );

  useFrame((state) => {
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

    const isErasing = useBeadStore.getState().mode === "erasing";
    const t = state.clock.elapsedTime;
    const pulse = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.4)));
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = isErasing ? pulse * 0.9 : pulse;
    material.needsUpdate = true;
    if (material.emissive) {
      material.emissive.set(isErasing ? "#ff3322" : "#000000");
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        renderOrder={2}
      />
    </group>
  );
}

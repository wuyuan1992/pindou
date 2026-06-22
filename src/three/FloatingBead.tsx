import { useMemo } from "react";
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
  const stack = useStackStore((s) => s.stack);
  const dragPos = useGrabStore((s) => s.dragPos);
  const hoveredIdx = useGrabStore((s) => s.hoveredIdx);
  const boardTransform = useLayoutStore((s) => s.transforms.board);
  const draggingItem = useLayoutStore((s) => s.draggingItem);
  const hoveringHandler = useLayoutStore((s) => s.hoveringHandler);
  const previewMode = useLayoutStore((s) => s.previewMode);

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

  if (!dragPos) return null;
  if (draggingItem) return null;
  if (hoveringHandler) return null;
  if (previewMode) return null;

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

  return (
    <group position={[baseX, baseY, baseZ]} rotation={[0, boardTransform.rotationY, 0]}>
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

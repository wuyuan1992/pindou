import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { useIsMobile } from "../hooks/useMediaQuery.ts";
import { DRAG_PLANE_Y, BOARD_N, CELL, worldToLocal } from "./constants.ts";

export function MouseTracker() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const isMobile = useIsMobile();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_PLANE_Y),
    []
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  // pointer 坐标缓存 + rAF 调度，把一帧内多次 pointermove 合并为一次 raycast。
  // rafRef 同时兼任 dedupe 和 cancel handle：非 null 表示已排队。
  const rafRef = useRef<number | null>(null);
  const clientRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;
    const half = (BOARD_N - 1) / 2;

    const runRaycast = () => {
      rafRef.current = null;
      const cp = clientRef.current;
      if (!cp) return;
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((cp.x - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((cp.y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, target);
      if (!hit) {
        // 保留 dragPos：让 FloatingBead 停在离开时的位置，鼠标回来无缝接续
        useGrabStore.getState().setHoveredIdx(null);
      } else {
        useGrabStore.getState().setDragPos([hit.x, hit.y, hit.z]);
        const boardTransform = useLayoutStore.getState().transforms.board;
        const [lx, lz] = worldToLocal(boardTransform, hit.x, hit.z);
        const col = Math.round(lx / CELL + half);
        const row = Math.round(lz / CELL + half);
        if (col < 0 || col >= BOARD_N || row < 0 || row >= BOARD_N) {
          useGrabStore.getState().setHoveredIdx(null);
        } else {
          useGrabStore.getState().setHoveredIdx(row * BOARD_N + col);
        }
      }
    };

    const schedule = (x: number, y: number) => {
      clientRef.current = { x, y };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(runRaycast);
      }
    };

    const onMove = (e: PointerEvent) => {
      schedule(e.clientX, e.clientY);
    };

    // 移动端：pointerdown 用 capture phase，确保 R3F 派发 pointerdown 到对象之前
    // dragPos/hoveredIdx 已同步到落点；否则 handlePrimaryDown 会读到 stale 值。
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      schedule(e.clientX, e.clientY);
    };

    const onLeave = () => {
      clientRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // 保留 dragPos：让 FloatingBead 停在离开时的位置，鼠标回来无缝接续
      // 避免清空导致的视觉跳跃（被误认为"重置到画板附近"）
      useGrabStore.getState().setHoveredIdx(null);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    if (isMobile) {
      canvas.addEventListener("pointerdown", onDown, { capture: true });
    }
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown, { capture: true } as AddEventListenerOptions);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [camera, gl, raycaster, plane, target, ndc, isMobile]);

  return null;
}

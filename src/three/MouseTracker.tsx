import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGrabStore } from "../store/useGrabStore.ts";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { DRAG_PLANE_Y, BOARD_N, CELL, worldToLocal } from "./constants.ts";

export function MouseTracker() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_PLANE_Y),
    []
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const half = (BOARD_N - 1) / 2;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, target);
      if (!hit) {
        useGrabStore.getState().setDragPos(null);
        useGrabStore.getState().setHoveredIdx(null);
        return;
      }
      useGrabStore.getState().setDragPos([hit.x, hit.y, hit.z]);
      const boardTransform = useLayoutStore.getState().transforms.board;
      const [lx, lz] = worldToLocal(boardTransform, hit.x, hit.z);
      const col = Math.round(lx / CELL + half);
      const row = Math.round(lz / CELL + half);
      if (col < 0 || col >= BOARD_N || row < 0 || row >= BOARD_N) {
        useGrabStore.getState().setHoveredIdx(null);
        return;
      }
      useGrabStore.getState().setHoveredIdx(row * BOARD_N + col);
    };

    const onLeave = () => {
      useGrabStore.getState().setDragPos(null);
      useGrabStore.getState().setHoveredIdx(null);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [camera, gl, raycaster, plane, target, ndc]);

  return null;
}

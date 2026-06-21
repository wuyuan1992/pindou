import { useEffect, useMemo, useRef, useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useLayoutStore, type ItemType } from "../store/useLayoutStore.ts";
import { useGrabStore } from "../store/useGrabStore.ts";
import { DRAG_PLANE_Y } from "./constants.ts";

interface ItemHandlerProps {
  itemKey: ItemType;
  side?: "right" | "left" | "top" | "bottom";
  offset?: [number, number, number];
  length?: number;
  onDoubleClick?: () => void;
}

const TABLE_BOUNDS = { minX: -19, maxX: 19, minZ: -14, maxZ: 14 };

export function ItemHandler({
  itemKey,
  side = "bottom",
  offset = [0, 0.5, 0],
  length = 2,
  onDoubleClick,
}: ItemHandlerProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_PLANE_Y),
    []
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const lastClickRef = useRef(0);
  const dragStartRef = useRef<{ x: number; z: number; px: number; pz: number } | null>(null);

  const setDraggingItem = useLayoutStore((s) => s.setDraggingItem);
  const setHoveringHandler = useLayoutStore((s) => s.setHoveringHandler);
  const draggingItem = useLayoutStore((s) => s.draggingItem);

  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;

    const getWorld = (clientX: number, clientY: number): [number, number] | null => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, target);
      if (!hit) return null;
      return [hit.x, hit.z];
    };

    const onMove = (e: PointerEvent) => {
      const wp = getWorld(e.clientX, e.clientY);
      if (!wp) return;
      const dragStart = dragStartRef.current;
      if (!dragStart) return;
      const dx = wp[0] - dragStart.x;
      const dz = wp[1] - dragStart.z;
      const newPx = dragStart.px + dx;
      const newPz = dragStart.pz + dz;
      const cx = Math.max(TABLE_BOUNDS.minX, Math.min(TABLE_BOUNDS.maxX, newPx));
      const cz = Math.max(TABLE_BOUNDS.minZ, Math.min(TABLE_BOUNDS.maxZ, newPz));
      useLayoutStore.getState().setTransform(itemKey, {
        position: [cx, 0, cz],
      });
    };

    const onUp = () => {
      setActive(false);
      dragStartRef.current = null;
      setDraggingItem(null);
      useGrabStore.getState().setDragPos(null);
      useGrabStore.getState().setHoveredIdx(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active, camera, gl, raycaster, plane, target, ndc, itemKey, setDraggingItem]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const now = performance.now();
    const last = lastClickRef.current;
    if (onDoubleClick && now - last < 320) {
      onDoubleClick();
      lastClickRef.current = 0;
      return;
    }
    lastClickRef.current = now;

    if (useLayoutStore.getState().previewMode) return;

    const native = e.nativeEvent as PointerEvent;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.x = ((native.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((native.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(plane, target);
    if (!hit) return;
    const current = useLayoutStore.getState().transforms[itemKey];
    dragStartRef.current = {
      x: hit.x,
      z: hit.z,
      px: current.position[0],
      pz: current.position[2],
    };
    setActive(true);
    setDraggingItem(itemKey);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setHoveringHandler(true);
    gl.domElement.style.cursor = "grab";
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setHoveringHandler(false);
    if (!active) gl.domElement.style.cursor = "";
  };

  const isHorizontal = side === "top" || side === "bottom";
  const isDragging = draggingItem === itemKey;

  const barArgs: [number, number, number] = isHorizontal
    ? [length, 0.45, 0.32]
    : [0.32, 0.45, length];
  const capSize: [number, number, number] = isHorizontal
    ? [0.12, 0.45, 0.42]
    : [0.42, 0.45, 0.12];
  const capPos1: [number, number, number] = isHorizontal
    ? [length / 2 + 0.06, 0, 0]
    : [0, 0, length / 2 + 0.06];
  const capPos2: [number, number, number] = isHorizontal
    ? [-length / 2 - 0.06, 0, 0]
    : [0, 0, -length / 2 - 0.06];
  const hitArgs: [number, number, number] = isHorizontal
    ? [length + 0.6, 1.1, 0.9]
    : [0.9, 1.1, length + 0.6];

  return (
    <group position={offset}>
      <mesh
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={hitArgs} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <RoundedBox
        args={barArgs}
        radius={0.1}
        smoothness={4}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
      >
        <meshPhysicalMaterial
          color={isDragging ? "#f6c168" : hovered ? "#d4af7f" : "#8a6b3f"}
          metalness={0.95}
          roughness={0.22}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.8}
          envMapIntensity={1.8}
          emissive={isDragging ? "#6b4a1a" : "#000000"}
          emissiveIntensity={isDragging ? 0.4 : 0}
        />
      </RoundedBox>
      <RoundedBox args={capSize} radius={0.04} smoothness={3} position={capPos1} castShadow>
        <meshPhysicalMaterial
          color="#c9a675"
          metalness={0.92}
          roughness={0.28}
          clearcoat={0.8}
          envMapIntensity={1.4}
        />
      </RoundedBox>
      <RoundedBox args={capSize} radius={0.04} smoothness={3} position={capPos2} castShadow>
        <meshPhysicalMaterial
          color="#c9a675"
          metalness={0.92}
          roughness={0.28}
          clearcoat={0.8}
          envMapIntensity={1.4}
        />
      </RoundedBox>
    </group>
  );
}

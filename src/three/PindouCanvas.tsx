import { Suspense, useEffect, useRef, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { BoardCluster, type BoardProps } from "./Board.tsx";
import { MouseTracker } from "./MouseTracker.tsx";
import { FloatingBead } from "./FloatingBead.tsx";
import { useLayoutStore } from "../store/useLayoutStore.ts";

interface PindouCanvasProps {
  className?: string;
  style?: CSSProperties;
  dpr?: [number, number];
  onPlace?: BoardProps["onPlace"];
  onPick?: BoardProps["onPick"];
  onErase?: BoardProps["onErase"];
}

const DEFAULT_CAM_POS = new THREE.Vector3(0, 22, 3);
const DEFAULT_CAM_LOOK = new THREE.Vector3(0, 0, 0);
const PREVIEW_CAM_HEIGHT = 22;
const PREVIEW_BOARD_LIFT = 2;

const SCALE_MIN = 0.4;
const SCALE_MAX = 2.5;
const SCALE_WHEEL_STEP = 0.08;

function clampScale(v: number): number {
  return THREE.MathUtils.clamp(v, SCALE_MIN, SCALE_MAX);
}

function BoardZoomRig() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;

    const applyScale = (next: number) => {
      const ls = useLayoutStore.getState();
      const cur = ls.transforms.board.scale;
      const clamped = clampScale(next);
      if (clamped !== cur) {
        ls.setTransform("board", { scale: clamped });
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const ls = useLayoutStore.getState();
      const cur = ls.transforms.board.scale;
      const dir = e.deltaY < 0 ? 1 : -1;
      applyScale(cur + dir * SCALE_WHEEL_STEP);
    };

    let pinchStartDist = 0;
    let pinchStartScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = touchDist(e);
        pinchStartScale = useLayoutStore.getState().transforms.board.scale;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDist === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const dist = touchDist(e);
      if (dist <= 0) return;
      const ratio = dist / pinchStartDist;
      applyScale(pinchStartScale * ratio);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
      }
    };

    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [gl]);

  return null;
}

function touchDist(e: TouchEvent): number {
  const a = e.touches[0];
  const b = e.touches[1];
  if (!a || !b) return 0;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const targetPos = useRef(DEFAULT_CAM_POS.clone());
  const targetLook = useRef(DEFAULT_CAM_LOOK.clone());
  const currentLook = useRef(DEFAULT_CAM_LOOK.clone());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useLayoutStore.getState().previewMode) {
        useLayoutStore.getState().setPreviewMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame(() => {
    const board = useLayoutStore.getState().transforms.board;
    if (useLayoutStore.getState().previewMode) {
      targetPos.current.set(board.position[0], PREVIEW_CAM_HEIGHT, board.position[2] + 0.01);
      targetLook.current.set(board.position[0], PREVIEW_BOARD_LIFT, board.position[2]);
    } else {
      targetPos.current.copy(DEFAULT_CAM_POS);
      targetLook.current.copy(DEFAULT_CAM_LOOK);
    }
    camera.position.lerp(targetPos.current, 0.08);
    currentLook.current.lerp(targetLook.current, 0.08);
    camera.lookAt(currentLook.current);
  });

  return null;
}

export function PindouCanvas({
  className,
  style,
  dpr = [1, 1.75],
  onPlace,
  onPick,
  onErase,
}: PindouCanvasProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        touchAction: "none",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        ...style,
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 22, 3], fov: 42, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        dpr={dpr}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig />
        <BoardZoomRig />
        <MouseTracker />

        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#ffffff", "#e8e8e8", 0.55]} />
        <directionalLight
          position={[6, 9, 4]}
          intensity={1.25}
        />
        <directionalLight position={[-5, 5, -3]} intensity={0.35} color="#b9d4ff" />

        <Suspense fallback={null}>
          <BoardCluster onPlace={onPlace} onPick={onPick} onErase={onErase} />
          <FloatingBead />
          <Environment resolution={256}>
            <Lightformer
              intensity={1.2}
              position={[0, 5, 0]}
              scale={[10, 10, 1]}
              color="#fff2dc"
            />
            <Lightformer
              intensity={0.7}
              position={[-4, 2.5, -3]}
              scale={[3, 3, 1]}
              rotation-y={Math.PI / 4}
              color="#ffe2b0"
            />
            <Lightformer
              intensity={0.6}
              position={[3, 2, 3]}
              scale={[3, 3, 1]}
              rotation-y={-Math.PI / 4}
              color="#cfe0ff"
            />
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}

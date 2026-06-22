import { Suspense, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { BoardCluster, type BoardProps } from "./Board.tsx";
import { MouseTracker } from "./MouseTracker.tsx";
import { FloatingBead } from "./FloatingBead.tsx";
import { PaletteTray } from "./PaletteTray.tsx";
import { Tray } from "./Tray.tsx";
import { useLayoutStore } from "../store/useLayoutStore.ts";
import { createTableMaterial } from "./materials.ts";

interface PindouCanvasProps {
  className?: string;
  style?: CSSProperties;
  onPlace?: BoardProps["onPlace"];
  onPick?: BoardProps["onPick"];
  onErase?: BoardProps["onErase"];
  onPickBead?: (colorId: string) => void;
  onTrayDrop?: (colorId: string) => void;
  onTrayPick?: (colorId: string) => void;
}

const DEFAULT_CAM_POS = new THREE.Vector3(0.5, 28, 11);
const DEFAULT_CAM_LOOK = new THREE.Vector3(0.5, 0, 0);
const PREVIEW_CAM_HEIGHT = 22;
const PREVIEW_BOARD_LIFT = 2;

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

function Table() {
  const material = useMemo(() => createTableMaterial(), []);
  return (
    <mesh position={[0, -0.03, 0]} material={material} receiveShadow>
      <boxGeometry args={[34, 0.06, 22]} />
    </mesh>
  );
}

export function PindouCanvas({
  className,
  style,
  onPlace,
  onPick,
  onErase,
  onPickBead,
  onTrayDrop,
  onTrayPick,
}: PindouCanvasProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%", ...style }}>
      <Canvas
        shadows
        camera={{ position: [0.5, 28, 11], fov: 44, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        // Capped at 1.75 (down from 2). On 2x-DPI screens this cuts the
        // fragment shader workload by ~25% with no visible difference.
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig />
        <MouseTracker />
        <color attach="background" args={["#f3ead6"]} />

        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#fff5e0", "#d8c394", 0.55]} />
        <directionalLight
          position={[6, 9, 4]}
          intensity={1.25}
          castShadow
          // 1024 is plenty for a top-down board shadow; 2048 doubled VRAM
          // and the blur from ContactShadows already hides the resolution.
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.25}
          shadow-camera-far={40}
          shadow-camera-left={-17}
          shadow-camera-right={17}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-5, 5, -3]} intensity={0.35} color="#b9d4ff" />

        <Suspense fallback={null}>
          <Table />
          <BoardCluster onPlace={onPlace} onPick={onPick} onErase={onErase} />
          <FloatingBead />
          <PaletteTray onPickBead={onPickBead} />
          <Tray onDrop={onTrayDrop} onPick={onTrayPick} />
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

        <ContactShadows
          position={[0, 0.0025, 0]}
          scale={20}
          far={3}
          blur={2.6}
          opacity={0.38}
          resolution={512}
          color="#3a2a18"
          frames={1}
        />
      </Canvas>
    </div>
  );
}

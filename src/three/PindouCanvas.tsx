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

const DEFAULT_CAM_POS = new THREE.Vector3(1, 46, 18);
const DEFAULT_CAM_LOOK = new THREE.Vector3(1, 0, 0);
const PREVIEW_CAM_HEIGHT = 32;
const PREVIEW_BOARD_LIFT = 4;

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
    camera.updateProjectionMatrix();
  });

  return null;
}

function Table() {
  const material = useMemo(() => createTableMaterial(), []);
  return (
    <mesh position={[0, -0.06, 0]} material={material} receiveShadow>
      <boxGeometry args={[44, 0.12, 32]} />
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
        camera={{ position: [1, 46, 18], fov: 44, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig />
        <MouseTracker />
        <color attach="background" args={["#f3ead6"]} />

        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#fff5e0", "#d8c394", 0.55]} />
        <directionalLight
          position={[12, 18, 8]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-34}
          shadow-camera-right={34}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
        />
        <directionalLight position={[-10, 10, -6]} intensity={0.35} color="#b9d4ff" />

        <Suspense fallback={null}>
          <Table />
          <BoardCluster onPlace={onPlace} onPick={onPick} onErase={onErase} />
          <FloatingBead />
          <PaletteTray onPickBead={onPickBead} />
          <Tray onDrop={onTrayDrop} onPick={onTrayPick} />
          <Environment resolution={512}>
            <Lightformer
              intensity={1.4}
              position={[0, 10, 0]}
              scale={[20, 20, 1]}
              color="#fff2dc"
            />
            <Lightformer
              intensity={0.85}
              position={[-8, 5, -6]}
              scale={[6, 6, 1]}
              rotation-y={Math.PI / 4}
              color="#ffe2b0"
            />
            <Lightformer
              intensity={0.7}
              position={[6, 4, 6]}
              scale={[6, 6, 1]}
              rotation-y={-Math.PI / 4}
              color="#cfe0ff"
            />
          </Environment>
        </Suspense>

        <ContactShadows
          position={[0, 0.005, 0]}
          scale={60}
          far={6}
          blur={2.6}
          opacity={0.38}
          resolution={1024}
          color="#3a2a18"
        />
      </Canvas>
    </div>
  );
}

"use client";

import { Html, PointerLockControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, Vector3 } from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";

const EYE_HEIGHT = 1.65;
const WALK_SPEED = 2.7;
const SPRINT_SPEED = 5.2;

type MovementKey = "forward" | "backward" | "left" | "right" | "sprint";

const keyMap: Record<string, MovementKey | undefined> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
};

function RoomModel() {
  const { scene } = useGLTF("/room.glb");

  const offset = useMemo(() => {
    const bounds = new Box3().setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    return new Vector3(-center.x, -bounds.min.y, -center.z);
  }, [scene]);

  useEffect(() => {
    scene.traverse((object) => {
      if ("isMesh" in object && object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group position={offset}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingModel() {
  return (
    <Html center>
      <div className="flex select-none items-center gap-3 whitespace-nowrap rounded-full bg-black/65 px-4 py-2 text-sm text-white backdrop-blur-md">
        <span className="h-4 w-4 animate-spin rounded-full border border-white/25 border-t-white" />
        Loading room
      </div>
    </Html>
  );
}

function FirstPersonController({ onLockChange }: { onLockChange: (locked: boolean) => void }) {
  const controls = useRef<PointerLockControlsImpl>(null);
  const keys = useRef<Record<MovementKey, boolean>>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });
  const { camera } = useThree();
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const movement = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const updateKey = (event: KeyboardEvent, pressed: boolean) => {
      const action = keyMap[event.code];
      if (!action) return;
      event.preventDefault();
      keys.current[action] = pressed;
    };

    const handleKeyDown = (event: KeyboardEvent) => updateKey(event, true);
    const handleKeyUp = (event: KeyboardEvent) => updateKey(event, false);
    const clearKeys = () => {
      Object.keys(keys.current).forEach((key) => {
        keys.current[key as MovementKey] = false;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  useFrame((_, delta) => {
    camera.position.y = EYE_HEIGHT;
    if (!controls.current?.isLocked) return;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    const forwardAxis = Number(keys.current.forward) - Number(keys.current.backward);
    const rightAxis = Number(keys.current.right) - Number(keys.current.left);

    movement.set(0, 0, 0);
    movement.addScaledVector(forward, forwardAxis);
    movement.addScaledVector(right, rightAxis);

    if (movement.lengthSq() > 0) {
      const speed = keys.current.sprint ? SPRINT_SPEED : WALK_SPEED;
      camera.position.addScaledVector(movement.normalize(), speed * Math.min(delta, 0.1));
      camera.position.y = EYE_HEIGHT;
    }
  });

  return (
    <PointerLockControls
      ref={controls}
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
    />
  );
}

function Scene({ onLockChange }: { onLockChange: (locked: boolean) => void }) {
  return (
    <>
      <color attach="background" args={["#171717"]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#f4f4f5", "#3f3f46", 1.1]} />
      <directionalLight
        castShadow
        position={[4, 8, 3]}
        intensity={1.4}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      <Suspense fallback={<LoadingModel />}>
        <RoomModel />
      </Suspense>
      <FirstPersonController onLockChange={onLockChange} />
    </>
  );
}

export default function RoomViewer() {
  const [isLocked, setIsLocked] = useState(false);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-neutral-950">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, EYE_HEIGHT, 0], fov: 65, near: 0.05, far: 1000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene onLockChange={setIsLocked} />
      </Canvas>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      </div>

      {!isLocked && (
        <div className="pointer-events-none absolute inset-x-4 bottom-6 flex justify-center sm:bottom-8">
          <div className="max-w-xl rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-center text-sm leading-6 text-white shadow-lg backdrop-blur-md">
            Click anywhere to explore <span className="text-white/45">•</span> WASD to move{" "}
            <span className="text-white/45">•</span> Mouse to look around{" "}
            <span className="text-white/45">•</span> Shift to sprint{" "}
            <span className="text-white/45">•</span> ESC to release
          </div>
        </div>
      )}
    </main>
  );
}

useGLTF.preload("/room.glb");

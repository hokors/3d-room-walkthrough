"use client";

import { Html, PointerLockControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Box3, DoubleSide, Vector3 } from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";

const EYE_HEIGHT = 1.45;
const WALK_SPEED = 2.7;
const SPRINT_SPEED = 5.2;
const MODEL_URL = "/room.glb?v=9_10_2026-ceiling-cap";

type MovementKey = "forward" | "backward" | "left" | "right" | "sprint";
type MobileInput = Record<MovementKey, boolean>;
type LookDelta = { x: number; y: number };

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
  const { scene } = useGLTF(MODEL_URL);

  const offset = useMemo(() => {
    const bounds = new Box3().setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    return new Vector3(-center.x, -bounds.min.y, -center.z);
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

function FirstPersonController({
  isTouch,
  mobileInput,
  lookDelta,
  onLockChange,
}: {
  isTouch: boolean;
  mobileInput: MutableRefObject<MobileInput>;
  lookDelta: MutableRefObject<LookDelta>;
  onLockChange: (locked: boolean) => void;
}) {
  const controls = useRef<PointerLockControlsImpl>(null);
  const keys = useRef<MobileInput>({
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

    if (isTouch) {
      camera.rotation.order = "YXZ";
      camera.rotation.y -= lookDelta.current.x * 0.0022;
      camera.rotation.x = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, camera.rotation.x - lookDelta.current.y * 0.0022),
      );
      lookDelta.current.x = 0;
      lookDelta.current.y = 0;
    } else if (!controls.current?.isLocked) {
      return;
    }

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    const activeInput = isTouch ? mobileInput.current : keys.current;
    const forwardAxis = Number(activeInput.forward) - Number(activeInput.backward);
    const rightAxis = Number(activeInput.right) - Number(activeInput.left);

    movement.set(0, 0, 0);
    movement.addScaledVector(forward, forwardAxis);
    movement.addScaledVector(right, rightAxis);

    if (movement.lengthSq() > 0) {
      const speed = activeInput.sprint ? SPRINT_SPEED : WALK_SPEED;
      camera.position.addScaledVector(movement.normalize(), speed * Math.min(delta, 0.1));
      camera.position.y = EYE_HEIGHT;
    }
  });

  return isTouch ? null : (
    <PointerLockControls
      ref={controls}
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
    />
  );
}

function Scene({
  isTouch,
  mobileInput,
  lookDelta,
  onLockChange,
}: {
  isTouch: boolean;
  mobileInput: MutableRefObject<MobileInput>;
  lookDelta: MutableRefObject<LookDelta>;
  onLockChange: (locked: boolean) => void;
}) {
  return (
    <>
      <color attach="background" args={["#171717"]} />
      <Suspense fallback={<LoadingModel />}>
        <RoomModel />
      </Suspense>
      <mesh position={[0, 2.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 8]} />
        <meshBasicMaterial color="#d8d8d4" side={DoubleSide} />
      </mesh>
      <FirstPersonController
        isTouch={isTouch}
        mobileInput={mobileInput}
        lookDelta={lookDelta}
        onLockChange={onLockChange}
      />
    </>
  );
}

function TouchControls({
  input,
  lookDelta,
  onInteract,
}: {
  input: MutableRefObject<MobileInput>;
  lookDelta: MutableRefObject<LookDelta>;
  onInteract: () => void;
}) {
  const lookPointer = useRef<number | null>(null);
  const lastPoint = useRef({ x: 0, y: 0 });

  const setPressed = (
    event: ReactPointerEvent<HTMLButtonElement>,
    action: MovementKey,
    pressed: boolean,
  ) => {
    event.preventDefault();
    input.current[action] = pressed;
    if (pressed) {
      event.currentTarget.setPointerCapture(event.pointerId);
      onInteract();
    }
  };

  const startLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== null) return;
    lookPointer.current = event.pointerId;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    onInteract();
  };

  const moveLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== event.pointerId) return;
    lookDelta.current.x += event.clientX - lastPoint.current.x;
    lookDelta.current.y += event.clientY - lastPoint.current.y;
    lastPoint.current = { x: event.clientX, y: event.clientY };
  };

  const stopLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current === event.pointerId) lookPointer.current = null;
  };

  const moveButton = (action: MovementKey, label: string, className: string) => (
    <button
      type="button"
      aria-label={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/45 text-xl text-white shadow-md backdrop-blur-sm active:bg-white/25 ${className}`}
      onPointerDown={(event) => setPressed(event, action, true)}
      onPointerUp={(event) => setPressed(event, action, false)}
      onPointerCancel={(event) => setPressed(event, action, false)}
      onLostPointerCapture={(event) => setPressed(event, action, false)}
    >
      {action === "forward" && "↑"}
      {action === "backward" && "↓"}
      {action === "left" && "←"}
      {action === "right" && "→"}
    </button>
  );

  return (
    <div className="absolute inset-0 z-10 touch-none select-none" aria-label="Touch controls">
      <div
        className="absolute inset-y-0 right-0 w-2/3"
        aria-label="Drag to look around"
        onPointerDown={startLook}
        onPointerMove={moveLook}
        onPointerUp={stopLook}
        onPointerCancel={stopLook}
      />

      <div className="absolute bottom-5 left-5 z-20 grid grid-cols-3 grid-rows-2 gap-1 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        {moveButton("forward", "Move forward", "col-start-2 row-start-1")}
        {moveButton("left", "Move left", "col-start-1 row-start-2")}
        {moveButton("backward", "Move backward", "col-start-2 row-start-2")}
        {moveButton("right", "Move right", "col-start-3 row-start-2")}
      </div>

      <button
        type="button"
        aria-label="Hold to sprint"
        className="absolute bottom-7 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/45 text-xs font-medium uppercase tracking-wider text-white shadow-md backdrop-blur-sm active:bg-white/25"
        onPointerDown={(event) => setPressed(event, "sprint", true)}
        onPointerUp={(event) => setPressed(event, "sprint", false)}
        onPointerCancel={(event) => setPressed(event, "sprint", false)}
        onLostPointerCapture={(event) => setPressed(event, "sprint", false)}
      >
        Run
      </button>
    </div>
  );
}

export default function RoomViewer() {
  const [isLocked, setIsLocked] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [hasTouched, setHasTouched] = useState(false);
  const mobileInput = useRef<MobileInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });
  const lookDelta = useRef<LookDelta>({ x: 0, y: 0 });

  useEffect(() => {
    const query = window.matchMedia("(any-pointer: coarse)");
    const updateInputMode = () => setIsTouch(query.matches);
    updateInputMode();
    query.addEventListener("change", updateInputMode);
    return () => query.removeEventListener("change", updateInputMode);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-neutral-950">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, EYE_HEIGHT, 0], fov: 65, near: 0.05, far: 1000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene
          isTouch={isTouch}
          mobileInput={mobileInput}
          lookDelta={lookDelta}
          onLockChange={setIsLocked}
        />
      </Canvas>

      {isTouch && (
        <TouchControls
          input={mobileInput}
          lookDelta={lookDelta}
          onInteract={() => setHasTouched(true)}
        />
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      </div>

      {(isTouch ? !hasTouched : !isLocked) && (
        <div className="pointer-events-none absolute inset-x-4 top-5 z-30 flex justify-center sm:bottom-8 sm:top-auto">
          <div className="max-w-xl rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-center text-sm leading-6 text-white shadow-lg backdrop-blur-md">
            {isTouch ? (
              <>
                Drag to look around <span className="text-white/45">•</span> Hold the arrows to move
              </>
            ) : (
              <>
                Click anywhere to explore <span className="text-white/45">•</span> WASD to move{" "}
                <span className="text-white/45">•</span> Mouse to look around{" "}
                <span className="text-white/45">•</span> Shift to sprint{" "}
                <span className="text-white/45">•</span> ESC to release
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

useGLTF.preload(MODEL_URL);

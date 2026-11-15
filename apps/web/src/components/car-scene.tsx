'use client';
import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { DoubleSide, Mesh, MeshStandardMaterial, SRGBColorSpace, Vector3 } from 'three';
import type { CarConfiguration } from '@apex/types';
import { Html, MeshReflectorMaterial, useGLTF } from '@react-three/drei';

function AssetCar({
  configuration,
  onReady,
}: {
  configuration: CarConfiguration;
  onReady: () => void;
}) {
  const { scene } = useGLTF(
    process.env.NEXT_PUBLIC_CAR_MODEL ||
      (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/models/gt-class-demo.glb',
  );
  const invalidate = useThree((state) => state.invalidate);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => material.clone())
          : object.material.clone();
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        if (object.name.startsWith('body_')) material.color.set(configuration.color);
        if (object.name.startsWith('wheel_'))
          material.color.set(configuration.wheels === 'black' ? '#202733' : '#a7b0bd');
        if (object.name.startsWith('caliper_')) material.color.set(configuration.caliper);
        if (object.name.startsWith('glass_'))
          material.color.set(configuration.tint === 'dark' ? '#070d15' : '#294c62');
      }
    });
    invalidate();
    onReady();
  }, [configuration, model, invalidate, onReady]);
  useEffect(
    () => () => {
      model.traverse((object) => {
        if (object instanceof Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
    [model],
  );
  return <primitive object={model} position={[0, -0.06, 0]} />;
}
function CameraControls({ playing, resetKey }: { playing: boolean; resetKey: number }) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate, gl } = useThree();
  useEffect(() => {
    camera.position.set(-6.5, 3.1, 6.2);
    ref.current?.target.set(0, 0.7, 0);
    ref.current?.update();
    invalidate();
  }, [resetKey, camera, invalidate]);
  useEffect(() => {
    const element = gl.domElement;
    element.tabIndex = 0;
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const target = ref.current?.target ?? new Vector3(0, 0.7, 0);
      const offset = camera.position.clone().sub(target);
      offset.applyAxisAngle(new Vector3(0, 1, 0), event.key === 'ArrowLeft' ? -0.15 : 0.15);
      camera.position.copy(target).add(offset);
      ref.current?.update();
      invalidate();
    };
    element.addEventListener('keydown', key);
    return () => element.removeEventListener('keydown', key);
  }, [camera, invalidate, gl]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableZoom={false}
      enablePan={false}
      autoRotate={playing}
      autoRotateSpeed={0.45}
      minPolarAngle={Math.PI / 3.5}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}
export default function CarScene({
  configuration,
  hotspots,
  labels,
  playing,
  resetKey,
  lowPower,
  onReady,
  onFailure,
  onCanvas,
}: {
  configuration: CarConfiguration;
  hotspots: boolean;
  labels: { wheels: string; tint: string; body: string };
  playing: boolean;
  resetKey: number;
  lowPower: boolean;
  onReady: () => void;
  onFailure: () => void;
  onCanvas: (canvas: HTMLCanvasElement) => void;
}) {
  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? 1 : [1, 1.65]}
      frameloop={playing ? 'always' : 'demand'}
      camera={{ position: [-6.5, 3.1, 6.2], fov: 35 }}
      gl={{
        alpha: true,
        antialias: !lowPower,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.domElement.addEventListener('webglcontextlost', onFailure, { once: true });
        onCanvas(gl.domElement);
      }}
    >
      <ambientLight intensity={1.5} />
      <hemisphereLight args={['#c0e4ff', '#1a2430', 2]} />
      <directionalLight
        position={[-4, 7, 4]}
        intensity={4.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[3, 4, -4]} color="#15ddeb" intensity={3} />
      <directionalLight position={[-5, 2, -4]} color="#dbe4ff" intensity={2} />
      <AssetCar configuration={configuration} onReady={onReady} />
      {hotspots && (
        <>
          <Html position={[-1.48, 0.8, 1.2]} center>
            <span className="hotspot-label">{labels.wheels}</span>
          </Html>
          <Html position={[0.3, 1.8, 0]} center>
            <span className="hotspot-label">{labels.tint}</span>
          </Html>
          <Html position={[-1.5, 1.2, 0]} center>
            <span className="hotspot-label">{labels.body}</span>
          </Html>
        </>
      )}
      {!lowPower && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
          <planeGeometry args={[16, 16]} />
          <MeshReflectorMaterial
            resolution={256}
            blur={[100, 30]}
            mixBlur={1}
            mixStrength={3}
            mirror={0.4}
            color="#101923"
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      )}
      {!lowPower && (
        <ContactShadows
          position={[0, -0.04, 0]}
          opacity={0.55}
          scale={13}
          blur={2.8}
          far={4}
          resolution={256}
          frames={1}
        />
      )}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.013, 100]} />
        <meshBasicMaterial color="#00c6d6" transparent opacity={0.24} side={DoubleSide} />
      </mesh>
      <CameraControls playing={playing} resetKey={resetKey} />
    </Canvas>
  );
}

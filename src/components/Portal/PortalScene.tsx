// src/components/PortalScene.tsx

import React, { useRef, useState, useEffect } from "react";
import { Group, Mesh, Texture } from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { usePortalEffect } from "../../hooks/usePortalEffect";
import { PortalMaterialImpl } from "../shaders/portalMaterial";

// World A: Blue world with a single box
const WorldA: React.FC = () => {
  return (
    <mesh position={[0, 0, -5]}>
      <boxGeometry args={[3, 3, 3]} />
      <meshStandardMaterial color="#4A90E2" />
    </mesh>
  );
};

// World B: Red world with a single sphere
const WorldB: React.FC = () => {
  return (
    <mesh position={[0, 0, -5]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color="#E24A4A" />
    </mesh>
  );
};

const PortalContent: React.FC = () => {

  // current / other world roots
  const currentRootRef = useRef<Group | null>(null);
  const otherRootRef = useRef<Group | null>(null);

  // portal plane
  const portalPlaneRef = useRef<Mesh | null>(null);

  // portal texture
  const [portalMap, setPortalMap] = useState<Texture | null>(null);

  // 0 = WorldA outside / WorldB inside, 1 = WorldB outside / WorldA inside
  const [mode, setMode] = useState<0 | 1>(0);

  // Enable portal effect
  usePortalEffect({
    currentRootRef,
    otherRootRef,
    portalPlaneRef,
    onUpdatePortalMap: (tex) => {
      setPortalMap(tex);
    },
  });

  // Click portal to switch inner/outer worlds
  const handleSwitch = () => {
    setMode((m) => (m === 0 ? 1 : 0));
  };

  // Toggle group visibility based on mode
  useFrame(() => {
    if (!currentRootRef.current || !otherRootRef.current) return;
    if (mode === 0) {
      // WorldA = current, WorldB = other
      currentRootRef.current.visible = true;
      otherRootRef.current.visible = false;
    } else {
      // WorldB = current, WorldA = other
      currentRootRef.current.visible = true;
      otherRootRef.current.visible = false;
    }
  });

  // Update portal material texture when portalMap changes
  useEffect(() => {
    if (portalPlaneRef.current && portalMap) {
      const material = portalPlaneRef.current.material as InstanceType<typeof PortalMaterialImpl>;
      if (material && material.map !== portalMap) {
        material.map = portalMap;
        material.needsUpdate = true;
      }
    }
  }, [portalMap]);

  return (
    <>
      {/* current world */}
      <group ref={currentRootRef}>
        {mode === 0 ? <WorldA /> : <WorldB />}
      </group>

      {/* other world (doesn't need visible, hook will temporarily enable it) */}
      <group ref={otherRootRef}>
        {mode === 0 ? <WorldB /> : <WorldA />}
      </group>

      {/* portal plane */}
      <mesh
        ref={portalPlaneRef}
        position={[0, 1.5, 0]}
        onClick={handleSwitch}
      >
        <planeGeometry args={[4, 6]} />
        {/* @ts-expect-error - portalMaterialImpl type definition issue with shaderMaterial */}
        <portalMaterialImpl />
      </mesh>

      {/* Add some lighting */}
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />

      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
};

// PortalScene now just exports PortalContent since Canvas is already in App.tsx
const PortalScene: React.FC = () => {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.5} />
      <PortalContent />
    </>
  );
};

export default PortalScene;

// src/components/PortalScene.tsx

import React, { useRef, useState, useEffect } from "react";
import { Group, Mesh, Texture, PerspectiveCamera } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Center, OrbitControls, Text3D } from "@react-three/drei";
import { usePortalEffect } from "../../hooks/usePortalEffect";
import { PortalMaterialImpl } from "../shaders/portalMaterial";
import ShardSystem from "../Shards/ShardSystem";
import Effects from "../Effects";
import { useShardShape, useShardGeometry, useExtrudeControls } from "../Shards/hooks";

const portalZPosition = -10; // portal position on Z axis

// World A: ShardSystem with default settings
const WorldA: React.FC<{ isCurrent?: boolean }> = ({ isCurrent = false }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 1] : [0, 0, portalZPosition-1];
    
    return <>
        <Center scale={0.5} position={centerPosition}>
            <Text3D font="./Pragmatica Black_Regular.json">Stage1</Text3D>
        </Center>
        <ShardSystem animationDuration={10} position={[0, 0, 0]} />
    </>
};

// World B: ShardSystem with different settings
const WorldB: React.FC<{ isCurrent?: boolean }> = ({ isCurrent = false }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 1] : [0, 0, portalZPosition-1];
    
    return <>
        <Center scale={0.5} position={centerPosition}>
            <Text3D font="./Pragmatica Black_Regular.json">Stage2</Text3D>
        </Center>
        <ShardSystem animationDuration={10} position={[0, 0, 0]} />
    </>
};

const PortalContent: React.FC = () => {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    // current / other world roots
    const currentRootRef = useRef<Group | null>(null);
    const otherRootRef = useRef<Group | null>(null);

    // portal plane
    const portalPlaneRef = useRef<Mesh | null>(null);

    // Shard geometry for portal
    const portalShapePath = "textures/shape1.svg"; // You can change this to any shape
    const paths = useShardShape(portalShapePath);
    const extrudeConfig = useExtrudeControls("Portal");
    const portalGeometry = useShardGeometry(paths, extrudeConfig);

    // portal texture
    const [portalMap, setPortalMap] = useState<Texture | null>(null);

    // 0 = WorldA outside / WorldB inside, 1 = WorldB outside / WorldA inside
    const [mode, setMode] = useState<0 | 1>(0);

    // Camera movement settings
    const cameraSpeed = 2.0; // units per second
    const startZPosition = 2; // starting camera position
    const isMovingRef = useRef(true); // control if camera should move

    // Enable portal effect with quality settings
    // resolutionMultiplier: 1.0 = screen resolution, 1.5 = 1.5x (default), 2.0 = 2x (high quality)
    usePortalEffect({
        currentRootRef,
        otherRootRef,
        portalPlaneRef,
        onUpdatePortalMap: (tex) => {
            setPortalMap(tex);
        },
        resolutionMultiplier: 2.0, // Increase for better quality (1.5-2.0 recommended)
    });

    // Initialize camera position
    useEffect(() => {
        const cam = camera as PerspectiveCamera;
        cam.position.set(0, 0, startZPosition);
        cam.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, []);

    // Click portal to switch inner/outer worlds (manual override)
    const handleSwitch = () => {
        setMode((m) => (m === 0 ? 1 : 0));
        // Reset camera position
        const cam = camera as PerspectiveCamera;
        cam.position.set(0, 0, startZPosition);
        cam.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
        isMovingRef.current = true;
    };

    // Camera movement and portal detection
    useFrame((_, delta) => {
        const cam = camera as PerspectiveCamera;

        // Move camera forward continuously
        if (isMovingRef.current) {
            cam.position.z -= cameraSpeed * delta;
            
            // Check if camera reached portal
            if (cam.position.z <= portalZPosition) {
                // Switch worlds
                setMode((m) => (m === 0 ? 1 : 0));
                
                // Reset camera position
                cam.position.set(0, 0, startZPosition);
                cam.lookAt(0, 0, 0);
                
                if (controlsRef.current) {
                    controlsRef.current.target.set(0, 0, 0);
                    controlsRef.current.update();
                }
            }
        }

        // Toggle group visibility based on mode
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
                {mode === 0 ? <WorldA isCurrent={true} /> : <WorldB isCurrent={true} />}
            </group>

            {/* other world (doesn't need visible, hook will temporarily enable it) */}
            <group ref={otherRootRef}>
                {mode === 0 ? <WorldB isCurrent={false} /> : <WorldA isCurrent={false} />}
            </group>

            {/* portal plane with shard geometry */}
            <mesh
                ref={portalPlaneRef}
                position={[0, 0, -10]}
                onClick={handleSwitch}
                scale={[1, 1, 1]} // Scale to match original plane size
            >
                <primitive object={portalGeometry} />
                {/* @ts-expect-error - portalMaterialImpl type definition issue with shaderMaterial */}
                <portalMaterialImpl />
            </mesh>

            {/* Add some lighting */}
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} />

            {/* Disable OrbitControls for automatic camera movement, or enable for manual control */}
            <OrbitControls 
                ref={controlsRef}
                enableDamping 
                dampingFactor={0.1}
                enabled={false} // Disable manual controls for automatic movement
            />
        </>
    );
};

// PortalScene now just exports PortalContent since Canvas is already in App.tsx
const PortalScene: React.FC = () => {
    return (
        <>
            <Effects />
            <color attach="background" args={["#000000"]} />
            <ambientLight intensity={0.5} />
            <PortalContent />
        </>
    );
};

export default PortalScene;

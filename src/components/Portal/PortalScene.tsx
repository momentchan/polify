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

const portalZPosition = -5; // portal position on Z axis
const distanceFromPortal = 3;

// World A: ShardSystem with default settings
const WorldA: React.FC<{ isCurrent?: boolean; stage: number }> = ({ isCurrent = false, stage }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 1] : [0, 0, portalZPosition-distanceFromPortal];
    
    return <>
        <Center scale={0.2} position={centerPosition}>
            <Text3D font="./Pragmatica Black_Regular.json">Stage{stage}</Text3D>
        </Center>
        <ShardSystem animationDuration={10} position={[0, 0, 0]} />
    </>
};

// World B: ShardSystem with different settings
const WorldB: React.FC<{ isCurrent?: boolean; stage: number }> = ({ isCurrent = false, stage }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 1] : [0, 0, portalZPosition-distanceFromPortal];
    
    return <>
        <Center scale={0.2} position={centerPosition}>
            <Text3D font="./Pragmatica Black_Regular.json">Stage{stage}</Text3D>
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
    
    // Current stage: cycles 1 -> 2 -> 3 -> 4 -> 1...
    // Other world always shows next stage: current+1 (or 1 if current is 4)
    const [currentStage, setCurrentStage] = useState(1);
    
    // Helper function to get next stage (1->2, 2->3, 3->4, 4->1)
    const getNextStage = (stage: number) => ((stage % 4) + 1);

    // Camera movement settings
    const cameraSpeed = 2.0; // units per second
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
        cam.position.set(0, 0, distanceFromPortal);
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
        cam.position.set(0, 0, distanceFromPortal);
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
                
                // Increment current stage: 1 -> 2 -> 3 -> 4 -> 1 (cycle)
                setCurrentStage((s) => getNextStage(s));
                
                // Reset camera position
                cam.position.set(0, 0, distanceFromPortal);
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
            {/* All stage instances always rendered - only visibility changes for smooth switching */}
            {/* This prevents ShardSystem from re-mounting and re-triggering explosion */}
            <group ref={currentRootRef}>
                {/* WorldA instances for all stages */}
                <group key="worldA-stage1" visible={mode === 0 && currentStage === 1}>
                    <WorldA isCurrent={true} stage={1} />
                </group>
                <group key="worldA-stage2" visible={mode === 1 && currentStage === 2}>
                    <WorldA isCurrent={true} stage={2} />
                </group>
                <group key="worldA-stage3" visible={mode === 0 && currentStage === 3}>
                    <WorldA isCurrent={true} stage={3} />
                </group>
                <group key="worldA-stage4" visible={mode === 1 && currentStage === 4}>
                    <WorldA isCurrent={true} stage={4} />
                </group>
                {/* WorldB instances for all stages */}
                <group key="worldB-stage1" visible={mode === 1 && currentStage === 1}>
                    <WorldB isCurrent={true} stage={1} />
                </group>
                <group key="worldB-stage2" visible={mode === 0 && currentStage === 2}>
                    <WorldB isCurrent={true} stage={2} />
                </group>
                <group key="worldB-stage3" visible={mode === 1 && currentStage === 3}>
                    <WorldB isCurrent={true} stage={3} />
                </group>
                <group key="worldB-stage4" visible={mode === 0 && currentStage === 4}>
                    <WorldB isCurrent={true} stage={4} />
                </group>
            </group>

            {/* Other world instances - always rendered, only visibility changes */}
            <group ref={otherRootRef}>
                <group key="other-worldB-stage2" visible={mode === 0 && currentStage === 1}>
                    <WorldB isCurrent={false} stage={2} />
                </group>
                <group key="other-worldA-stage3" visible={mode === 0 && currentStage === 2}>
                    <WorldA isCurrent={false} stage={3} />
                </group>
                <group key="other-worldB-stage4" visible={mode === 0 && currentStage === 3}>
                    <WorldB isCurrent={false} stage={4} />
                </group>
                <group key="other-worldA-stage1" visible={mode === 0 && currentStage === 4}>
                    <WorldA isCurrent={false} stage={1} />
                </group>
                <group key="other-worldA-stage2-mode1" visible={mode === 1 && currentStage === 1}>
                    <WorldA isCurrent={false} stage={2} />
                </group>
                <group key="other-worldB-stage3-mode1" visible={mode === 1 && currentStage === 2}>
                    <WorldB isCurrent={false} stage={3} />
                </group>
                <group key="other-worldA-stage4-mode1" visible={mode === 1 && currentStage === 3}>
                    <WorldA isCurrent={false} stage={4} />
                </group>
                <group key="other-worldB-stage1-mode1" visible={mode === 1 && currentStage === 4}>
                    <WorldB isCurrent={false} stage={1} />
                </group>
            </group>

            {/* portal plane with shard geometry */}
            <mesh
                ref={portalPlaneRef}
                position={[0, 0, portalZPosition]}
                onClick={handleSwitch}
                scale={[0.5, 0.5, 0.5]} // Scale to match original plane size
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

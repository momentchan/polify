// src/components/PortalScene.tsx

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Group, Mesh, Texture, PerspectiveCamera, MathUtils } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import { useControls } from "leva";
import { usePortalEffect } from "../../hooks/usePortalEffect";
import { getPortalMaterial } from "../shaders/portalMaterial";
import ShardSystem from "../Shards/ShardSystem";
import Effects from "../Effects";
import { useShardShape, useShardGeometry, useExtrudeControls, useMaterialControls, useMaterialProperties, useFresnelControls } from "../Shards/hooks";

const portalZPosition = -3; // portal position on Z axis
const distanceFromPortal = 0.5;
const portalScale = 0.1;

// Image plane component for stage display
const StageImage: React.FC<{ stage: number }> = ({ stage }) => {
    const imagePath = `/textures/img${stage}.avif`;
    const texture = useTexture(imagePath);
    
    // Calculate aspect ratio to maintain image proportions
    const aspectRatio = useMemo(() => {
        if (texture && (texture as any).image) {
            const img = (texture as any).image as HTMLImageElement;
            if (img.width && img.height) {
                return img.width / img.height;
            }
        }
        return 1;
    }, [texture]);
    
    const width = 2; // Base width
    const height = width / aspectRatio;
    
    return (
        <mesh>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={texture} transparent />
        </mesh>
    );
};

// World A: ShardSystem with default settings
const WorldA: React.FC<{ isCurrent?: boolean; stage: number }> = ({ isCurrent = false, stage }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 0] : [0, 0, portalZPosition-distanceFromPortal];
    
    return <>
        <group position={centerPosition} scale={[0.2, 0.2, 0.2]}>
            <StageImage stage={stage} />
        </group>
        <ShardSystem animationDuration={10} position={centerPosition} />
    </>
};

// World B: ShardSystem with different settings
const WorldB: React.FC<{ isCurrent?: boolean; stage: number }> = ({ isCurrent = false, stage }) => {
    // Position: [0, 0, 1] for current world, [0, 0, -1] for other world
    const centerPosition: [number, number, number] = isCurrent ? [0, 0, 0] : [0, 0, portalZPosition-distanceFromPortal];
    
    return <>
        <group position={centerPosition} scale={[0.2, 0.2, 0.2]}>
            <StageImage stage={stage} />
        </group>
        <ShardSystem animationDuration={10} position={centerPosition} />
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
    
    // Load scratch texture
    const scratchTex = useTexture('/textures/scratch.jpg');
    
    // Fresnel controls
    const fresnelConfig = useFresnelControls("Portal");
    
    // Scratch blend control
    const { scratchBlend } = useControls('Portal.Material.Texture', {
        scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true });
    
    // Create CSM material with MeshPhysicalMaterial base (same as shard material)
    const portalMaterial = useMemo(() => {
        return getPortalMaterial(
            portalMap,
            scratchTex,
            {
                power: fresnelConfig.power,
                intensity: fresnelConfig.enabled ? fresnelConfig.intensity : 0.0,
                color: fresnelConfig.color,
            },
            scratchBlend
        );
    }, [portalMap, scratchTex, fresnelConfig, scratchBlend]);

    // Material controls (same settings as shard material)
    const materialControls = useMaterialControls("Portal");

    // Apply material properties from controls
    // CSM material extends MeshPhysicalMaterial, so we can use it directly
    useMaterialProperties(portalMaterial, materialControls);
    
    // Update fresnel uniforms when controls change
    useEffect(() => {
        if (portalMaterial) {
            const uniforms = portalMaterial.uniforms as any;
            if (uniforms.uFresnelPower) uniforms.uFresnelPower.value = fresnelConfig.power;
            if (uniforms.uFresnelIntensity) uniforms.uFresnelIntensity.value = fresnelConfig.enabled ? fresnelConfig.intensity : 0.0;
            if (uniforms.uFresnelColor) uniforms.uFresnelColor.value.set(fresnelConfig.color);
        }
    }, [portalMaterial, fresnelConfig]);
    
    // Update scratch blend when control changes
    useEffect(() => {
        if (portalMaterial) {
            const uniforms = portalMaterial.uniforms as any;
            if (uniforms.uScratchBlend) {
                uniforms.uScratchBlend.value = scratchBlend;
            }
        }
    }, [portalMaterial, scratchBlend]);

    // 0 = WorldA outside / WorldB inside, 1 = WorldB outside / WorldA inside
    const [mode, setMode] = useState<0 | 1>(0);
    
    // Current stage: cycles 1 -> 2 -> 3 -> 4 -> 1...
    // Other world always shows next stage: current+1 (or 1 if current is 4)
    const [currentStage, setCurrentStage] = useState(1);
    
    // Helper function to get next stage (1->2, 2->3, 3->4, 4->1)
    const getNextStage = (stage: number) => ((stage % 4) + 1);

    // Camera movement settings
    const scrollSpeed = 0.2; // units per scroll event
    const lerpSpeed = 0.1; // interpolation speed (0-1, higher = faster)
    const targetZRef = useRef(distanceFromPortal); // target Z position for smooth movement
    const textUpdatedRef = useRef(false); // track if text has been updated for current approach
    
    // Use refs to track state for synchronous updates
    const modeRef = useRef(mode);
    const stageRef = useRef(currentStage);
    
    // Sync refs with state
    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);
    
    useEffect(() => {
        stageRef.current = currentStage;
    }, [currentStage]);

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
        targetZRef.current = distanceFromPortal;
        cam.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, []);

    // Click portal to switch inner/outer worlds (manual override)
    const handleSwitch = () => {
        setMode((m) => (m === 0 ? 1 : 0));
        // Reset camera position and target
        const cam = camera as PerspectiveCamera;
        cam.position.set(0, 0, distanceFromPortal);
        targetZRef.current = distanceFromPortal;
        cam.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    };

    // Handle mouse wheel scroll for camera movement
    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            // Only move forward on scroll down (positive deltaY)
            if (event.deltaY > 0) {
                // Update target position instead of directly moving camera
                targetZRef.current -= scrollSpeed;

                console.log('targetZRef', targetZRef.current);
                // Prevent default scrolling behavior
                event.preventDefault();
            }
        };

        // Add event listener to window
        window.addEventListener('wheel', handleWheel, { passive: false });

        // Cleanup
        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);


    // Camera movement and portal detection
    useFrame(() => {
        const cam = camera as PerspectiveCamera;

        // Smoothly interpolate camera position towards target
        cam.position.z = MathUtils.lerp(cam.position.z, targetZRef.current, lerpSpeed);

        // Update camera position uniform for fresnel calculation
        if (portalMaterial) {
            const uniforms = portalMaterial.uniforms as any;
            if (uniforms.uCamPos) {
                uniforms.uCamPos.value.copy(cam.position);
            }
            
            // Update transition ratio based on camera distance to portal
            // Calculate total distance from start position to portal
            const startZ = distanceFromPortal; // Starting position
            const portalZ = portalZPosition; // Portal position
            const totalDistance = Math.abs(startZ - portalZ);
            
            // Current distance from portal (clamped to valid range)
            const currentDistanceFromPortal = Math.max(0, Math.min(totalDistance, cam.position.z - portalZ));
            
            // Transition ratio: 0.0 = at start, 1.0 = at portal
            const transitionRatio = 1.0 - (currentDistanceFromPortal / totalDistance);
            
            if (uniforms.uTransitionRatio) {
                uniforms.uTransitionRatio.value = Math.max(0.0, Math.min(1.0, transitionRatio));
            }
        }

        // Check if camera reached portal
        if (cam.position.z <= portalZPosition + 1e-6) {
            // Switch worlds and update stage atomically using refs
            const currentMode = modeRef.current;
            const currentStageValue = stageRef.current;
            
            // Update both mode and stage synchronously
            const newMode = currentMode === 0 ? 1 : 0;
            const newStage = getNextStage(currentStageValue);
            
            setMode(newMode);
            setCurrentStage(newStage);
            
            // Reset text update flag for next cycle
            textUpdatedRef.current = false;
            
            // Reset transition ratio when camera resets
            if (portalMaterial) {
                const uniforms = portalMaterial.uniforms as any;
                if (uniforms.uTransitionRatio) {
                    uniforms.uTransitionRatio.value = 0.0;
                }
            }
            
            // Reset camera position and target
            cam.position.set(0, 0, distanceFromPortal);
            targetZRef.current = distanceFromPortal;
            cam.lookAt(0, 0, 0);
            
            if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
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
        if (portalMap && portalMaterial) {
            const uniforms = portalMaterial.uniforms as any;
            if (uniforms.map && uniforms.map.value !== portalMap) {
                uniforms.map.value = portalMap;
                portalMaterial.needsUpdate = true;
            }
        }
    }, [portalMap, portalMaterial]);


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
                scale={[portalScale, portalScale, portalScale]}
                material={portalMaterial}
            >
                <primitive object={portalGeometry} />
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

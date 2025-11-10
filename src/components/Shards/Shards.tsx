import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Shard from "./Shard";
import type { ShardDefinition } from "./types";
import { createShardInstances } from "./generator";
import type { SharedAnimationValue } from "./hooks";

export const SHARD_DATABASE: ShardDefinition[] = [
    { image: "textures/img1.avif", shape: "textures/shape1.svg" },
    { image: "textures/img2.avif", shape: "textures/shape2.svg" },
    { image: "textures/img3.avif", shape: "textures/shape3.svg" },
    { image: "textures/img4.avif", shape: "textures/shape4.svg" },
    { image: "textures/img5.avif", shape: "textures/shape1.svg" },
];

interface ShardsProps {
    animValueRef?: React.RefObject<SharedAnimationValue>;
}

export default function Shards({ animValueRef }: ShardsProps) {
    const shards = useMemo(() => createShardInstances(SHARD_DATABASE), []);
    const groupRef = useRef<THREE.Group>(null!);
    
    // Target rotation quaternion for centering clicked shard
    const targetQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const currentQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const isRotatingToTarget = useRef<boolean>(false);

    // Handle shard click: rotate group to center the clicked shard
    const handleShardClick = (shardPosition: [number, number, number]) => {
        if (!groupRef.current) return;
        
        // Create direction vector from origin to shard position
        const shardDirection = new THREE.Vector3(...shardPosition).normalize();
        
        // Target direction: we want shard to be on the closer side (positive Z) facing camera
        // Camera looks down -Z axis, so (0, 0, 1) puts shard closer to camera
        const targetDirection = new THREE.Vector3(0, 0, 1);
        
        // Calculate quaternion that rotates shardDirection to targetDirection
        const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(
            shardDirection,
            targetDirection
        );
        
        // Set target quaternion and reset rotation progress
        targetQuaternion.current.copy(rotationQuaternion);
        rotationProgress.current = 0;
        rotationDuration.current = 0;
        isRotatingToTarget.current = true;
    };

    // Rotation progress tracking for easing
    const rotationProgress = useRef<number>(0);
    const rotationDuration = useRef<number>(0);
    const startQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());

    // Group rotation animation
    useFrame((_, delta) => {
        if (!groupRef.current || !animValueRef?.current) return;
        
        // If rotating to target, smoothly interpolate with ease-in-out
        if (isRotatingToTarget.current) {
            const totalDuration = 1.0; // seconds
            
            // Initialize rotation progress on first frame
            if (rotationDuration.current === 0) {
                rotationProgress.current = 0;
                rotationDuration.current = totalDuration;
                startQuaternion.current.copy(currentQuaternion.current);
            }
            
            // Update progress
            rotationProgress.current += delta / rotationDuration.current;
            
            if (rotationProgress.current >= 1.0) {
                // Animation complete, snap to target
                currentQuaternion.current.copy(targetQuaternion.current);
                groupRef.current.quaternion.copy(currentQuaternion.current);
                
                // Reset rotation state
                rotationProgress.current = 0;
                rotationDuration.current = 0;
                isRotatingToTarget.current = false;
            } else {
                // Apply ease-in-out easing: smoothstep function
                // smoothstep(t) = 3t² - 2t³, which gives smooth acceleration and deceleration
                const t = rotationProgress.current;
                const easedT = t * t * (3 - 2 * t); // smoothstep
                
                // Slerp from start to target with eased progress
                currentQuaternion.current.slerpQuaternions(
                    startQuaternion.current,
                    targetQuaternion.current,
                    easedT
                );
                
                // Apply rotation to group
                groupRef.current.quaternion.copy(currentQuaternion.current);
            }
        }
    });

    return (
        <group ref={groupRef}>
            {shards.map((shard) => (
                <Shard
                    key={shard.id}
                    shard={shard}
                    debug={false}
                    animValueRef={animValueRef}
                    onShardClick={handleShardClick}
                />
            ))}
        </group>
    );
}
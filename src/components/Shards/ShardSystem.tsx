import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import * as THREE from "three";
import { useSharedAnimation } from "./hooks";
import Shards from "./Shards";
import ShardParticles from "./Particles/ShardParticles";

interface ShardSystemProps {
    animationDuration?: number;
    position?: [number, number, number];
}

/**
 * System component that manages shared animation value for Shards and Particles
 */
export default function ShardSystem({ 
    animationDuration = 10,
    position = [0, 0, -6]
}: ShardSystemProps) {
    // Shared animation value synchronized across all components
    const animValueRef = useSharedAnimation(animationDuration);
    const groupRef = useRef<THREE.Group>(null!);

    // Group rotation animation
    useFrame((_, delta) => {
        if (!groupRef.current || !animValueRef.current) return;
        
        const smoothRotationSpeed = MathUtils.lerp(
            5,
            0.1,
            THREE.MathUtils.smoothstep(animValueRef.current.value, 0, 0.6)
        ) * 0.2;
        groupRef.current.rotation.y += delta * smoothRotationSpeed;
    });

    return (
        <group ref={groupRef} position={position}>
            <Shards animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape1.svg" count={64} animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape2.svg" count={64} animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape3.svg" count={64} animValueRef={animValueRef} />
            <ShardParticles shapePath="textures/shape4.svg" count={64} animValueRef={animValueRef} />
        </group>
    );
}


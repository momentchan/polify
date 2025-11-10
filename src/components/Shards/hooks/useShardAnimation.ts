import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { SharedAnimationValue } from "./useSharedAnimation";

interface UseShardAnimationProps {
    groupRef: React.RefObject<THREE.Group>;
    animValueRef?: React.RefObject<SharedAnimationValue | null>;
}

/**
 * Hook to apply animation effects to shards based on shared animation value
 */
export function useShardAnimation({
    groupRef,
    animValueRef,
}: UseShardAnimationProps) {
    // Example: You can add shard-specific animations here
    // For now, this is a placeholder that can be extended
    useFrame(() => {
        if (!groupRef.current || !animValueRef?.current) return;
        
        // Example: Scale shards based on animation value
        // const scale = THREE.MathUtils.lerp(0.8, 1.0, animValueRef.current.value);
        // groupRef.current.scale.setScalar(scale);
        
        // Example: Rotate shards based on animation value
        // groupRef.current.rotation.y = animValueRef.current.value * Math.PI * 2;
    });
}


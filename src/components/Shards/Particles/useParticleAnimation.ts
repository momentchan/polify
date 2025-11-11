import { useFrame } from "@react-three/fiber";
import type { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import type { ParticleMaterialUniforms } from "../utils";
import type { SharedAnimationValue } from "../hooks";

export interface DistanceSlowMotionConfig {
    // Distance-based slow motion with four zones
    distance1?: number;              // First distance threshold - start of first transition (default: 4.0)
    distance2?: number;              // Second distance threshold - end of first transition (default: 6.0)
    distance3?: number;              // Third distance threshold - end of second transition (default: 8.0)
    timeScale1?: number;             // Time scale for d < d1 (normal speed, default: 1.0)
    timeScale2?: number;             // Time scale for d1 < d < d2 transition end (default: 0.01)
    timeScale3?: number;             // Time scale for d > d3 (slowest motion, default: 0.001)
    rotationMultiplier?: number;     // Rotation speed multiplier factor (default: 20.0)
    distanceRandomization?: number;  // Amount of distance randomization per particle (0 = none, default: 0.5)
}

const DEFAULT_DISTANCE_CONFIG: DistanceSlowMotionConfig = {
    distance1: 3.0,
    distance2: 5.0,
    distance3: 7.0,
    timeScale1: 1.0,
    timeScale2: 0.01,
    timeScale3: 0.00,
    rotationMultiplier: 20.0,
    distanceRandomization: 0.5,
};

interface UseParticleAnimationProps {
    behavior: AnimatedDampingBehavior;
    material: { uniforms: Record<string, { value: any }> };
    animValueRef: React.RefObject<SharedAnimationValue>;
    distanceConfig?: Partial<DistanceSlowMotionConfig>;
}

export function useParticleAnimation({
    behavior,
    material,
    animValueRef,
    distanceConfig = {},
}: UseParticleAnimationProps) {
    // Merge user config with defaults
    const config: DistanceSlowMotionConfig = { ...DEFAULT_DISTANCE_CONFIG, ...distanceConfig };


    // Animation frame updates
    useFrame((state, delta) => {
        const animValue = animValueRef.current.value;
        
        behavior.animationValueUniform.value = animValue;
        
        // Update distance-based slow motion uniforms
        behavior.distance1Uniform.value = config.distance1 ?? 4.0;
        behavior.distance2Uniform.value = config.distance2 ?? 6.0;
        behavior.distance3Uniform.value = config.distance3 ?? 8.0;
        behavior.timeScale1Uniform.value = config.timeScale1 ?? 1.0;
        behavior.timeScale2Uniform.value = config.timeScale2 ?? 0.01;
        behavior.timeScale3Uniform.value = config.timeScale3 ?? 0.001;
        behavior.rotationMultiplierUniform.value = config.rotationMultiplier ?? 20.0;
        behavior.distanceRandomizationUniform.value = config.distanceRandomization ?? 0.5;

        // Update material uniforms
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.time.value = state.clock.elapsedTime;
        materialUniforms.delta.value = Math.min(0.02, delta); // Clamp delta (shader handles distance-based scaling)
    });

    return { animValueRef };
}


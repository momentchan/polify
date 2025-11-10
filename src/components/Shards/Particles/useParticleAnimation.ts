import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import * as THREE from "three";
import type { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import type { ParticleMaterialUniforms } from "../utils";
import type { SharedAnimationValue } from "../hooks";

interface UseParticleAnimationProps {
    behavior: AnimatedDampingBehavior;
    material: { uniforms: Record<string, { value: any }> };
    animValueRef: React.RefObject<SharedAnimationValue>;
}

export function useParticleAnimation({
    behavior,
    material,
    animValueRef,
}: UseParticleAnimationProps) {

    // Initialize damping value immediately after mount
    useEffect(() => {
        behavior.dampingUniform.value = 1.0;
        const timeout = setTimeout(() => {
            behavior.dampingUniform.value = 1.0;
        }, 0);
        return () => clearTimeout(timeout);
    }, [behavior]);

    // Animation frame updates
    useFrame((state, delta) => {
        // Calculate damping based on animation value
        const damping = MathUtils.lerp(
            1,
            0.95,
            THREE.MathUtils.smoothstep(animValueRef.current.value, 0.5, 0.7)
        );
        behavior.dampingUniform.value = damping;

        // Update animation value for velocity shader
        behavior.animationValueUniform.value = animValueRef.current.value;

        // Update material uniforms
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.time.value = state.clock.elapsedTime;
        materialUniforms.delta.value = delta;
    });

    return { animValueRef };
}


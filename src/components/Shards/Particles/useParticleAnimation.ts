import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import * as THREE from "three";
import type { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import type { ParticleMaterialUniforms } from "../shardMirrorUtils";

interface UseParticleAnimationProps {
    behavior: AnimatedDampingBehavior;
    material: { uniforms: Record<string, { value: any }> };
    groupRef: React.RefObject<THREE.Group>;
}

export function useParticleAnimation({
    behavior,
    material,
    groupRef,
}: UseParticleAnimationProps) {
    const animValueRef = useRef({ value: 0 });

    // GSAP animation: value goes from 0 to 1
    useEffect(() => {
        gsap.to(animValueRef.current, {
            value: 1,
            duration: 10,
        });
    }, []);

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
            THREE.MathUtils.smoothstep(animValueRef.current.value, 0.3, 0.4)
        );
        behavior.dampingUniform.value = damping;

        // Update animation value for velocity shader
        behavior.animationValueUniform.value = animValueRef.current.value;

        // Group rotation animation
        const smoothRotationSpeed = MathUtils.lerp(
            5,
            0.1,
            THREE.MathUtils.smoothstep(animValueRef.current.value, 0, 0.6)
        ) * 0.2;
        groupRef.current.rotation.y += delta * smoothRotationSpeed;

        // Update material uniforms
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.time.value = state.clock.elapsedTime;
        materialUniforms.delta.value = delta;
    });

    return { animValueRef };
}


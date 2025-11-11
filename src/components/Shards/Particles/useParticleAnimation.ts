import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import * as THREE from "three";
import { useRef } from "react";
import type { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import type { ParticleMaterialUniforms } from "../utils";
import type { SharedAnimationValue } from "../hooks";

export interface TimeScaleConfig {
    // Animation value thresholds
    explosionEnd: number;        // When explosion phase ends (default: 0.15)
    transitionEnd: number;       // When transition phase ends (default: 0.2)
    
    // Time scale values
    explosionTimeScale: number;  // Time scale during explosion (default: 1.0)
    transitionStartTimeScale: number; // Time scale at start of transition (default: 1.0)
    transitionEndTimeScale: number;   // Time scale at end of transition (default: 0.01)
    slowMotionStartTimeScale: number; // Time scale at start of slow motion (default: 0.01)
    slowMotionEndTimeScale: number;   // Time scale at end of slow motion (default: 0.0)
    
    // Delta stabilization
    deltaSmoothingFactor?: number; // Smoothing factor for delta (0-1, higher = more smoothing, default: 0.1)
    maxDelta?: number;             // Maximum delta clamp value (default: 0.1)
    timeScaleSmoothingFactor?: number; // Smoothing factor for timeScale transitions (0-1, default: 0.2)
}

const DEFAULT_TIME_SCALE_CONFIG: TimeScaleConfig = {
    explosionEnd: 0.15,
    transitionEnd: 0.25,
    explosionTimeScale: 1.0,
    transitionStartTimeScale: 1.0,
    transitionEndTimeScale: 0.1,
    slowMotionStartTimeScale: 0.02,
    slowMotionEndTimeScale: 0.0005,
    deltaSmoothingFactor: 0.1,
    maxDelta: 0.1,
    timeScaleSmoothingFactor: 0.2,
};

interface UseParticleAnimationProps {
    behavior: AnimatedDampingBehavior;
    material: { uniforms: Record<string, { value: any }> };
    animValueRef: React.RefObject<SharedAnimationValue>;
    timeScaleConfig?: Partial<TimeScaleConfig>;
}

export function useParticleAnimation({
    behavior,
    material,
    animValueRef,
    timeScaleConfig = {},
}: UseParticleAnimationProps) {
    // Merge user config with defaults
    const config: TimeScaleConfig = { ...DEFAULT_TIME_SCALE_CONFIG, ...timeScaleConfig };
    
    // Calculate transition window size
    const transitionWindow = config.transitionEnd - config.explosionEnd;
    // Calculate slow motion phase duration (from transitionEnd to 1.0)
    const slowMotionDuration = 1.0 - config.transitionEnd;

    // Delta smoothing refs
    const smoothedDeltaRef = useRef<number>(0.016); // Start with ~60fps delta
    const smoothedTimeScaleRef = useRef<number>(config.explosionTimeScale);

    // Damping removed - particles maintain velocity, slow motion via delta scaling only

    // Animation frame updates
    useFrame((state, delta) => {
        const animValue = animValueRef.current.value;
        
        // Stabilize delta: clamp to max and apply exponential smoothing
        const clampedDelta = Math.min(delta, config.maxDelta ?? 0.1);
        const smoothingFactor = config.deltaSmoothingFactor ?? 0.1;
        smoothedDeltaRef.current = MathUtils.lerp(
            smoothedDeltaRef.current,
            clampedDelta,
            smoothingFactor
        );
        
        // No damping - particles maintain their velocity
        // Slow motion achieved purely through time dilation (delta scaling)
        let targetTimeScale: number; // Target multiplier for delta to create time dilation effect
        
        if (animValue < config.explosionEnd) {
            // Explosion phase - normal time speed, particles fly fast
            targetTimeScale = config.explosionTimeScale;
        } else if (animValue < config.transitionEnd) {
            // Fast transition to slow motion
            const transitionProgress = (animValue - config.explosionEnd) / transitionWindow;
            // Use smoothstep for smoother easing
            const eased = THREE.MathUtils.smoothstep(transitionProgress, 0, 1);
            // Time scale transitions from transitionStartTimeScale to transitionEndTimeScale
            targetTimeScale = MathUtils.lerp(config.transitionStartTimeScale, config.transitionEndTimeScale, eased);
        } else {
            // Slow motion phase - time slows down dramatically
            const slowMotionProgress = (animValue - config.transitionEnd) / slowMotionDuration;
            const eased = THREE.MathUtils.smoothstep(slowMotionProgress, 0, 1);
            // Time scale continues to slow down
            targetTimeScale = MathUtils.lerp(config.slowMotionStartTimeScale, config.slowMotionEndTimeScale, eased);
        }
        
        // Smooth timeScale transitions to prevent sudden jumps
        const timeScaleSmoothing = config.timeScaleSmoothingFactor ?? 0.2;
        smoothedTimeScaleRef.current = MathUtils.lerp(
            smoothedTimeScaleRef.current,
            targetTimeScale,
            timeScaleSmoothing
        );
        
        const timeScale = smoothedTimeScaleRef.current;
        
        // Update animation value for velocity shader
        behavior.animationValueUniform.value = animValue;
        
        // Update timeScale uniform - this scales delta in the GPGPU shaders
        behavior.timeScaleUniform.value = timeScale;

        // Update material uniforms with smoothed and scaled delta for time dilation effect
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.time.value = state.clock.elapsedTime;
        materialUniforms.delta.value = smoothedDeltaRef.current * timeScale; // Use smoothed delta
    });

    return { animValueRef };
}


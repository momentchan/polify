import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";

export interface SharedAnimationValue {
    value: number;
}

export interface SharedAnimationControls {
    start: () => void;
    stop: () => void;
    reset: () => void;
    restart: () => void;
}

/**
 * Shared animation hook that creates a single animation value synchronized across components
 * Returns a ref object that can be passed to multiple components
 * 
 * @param duration - Animation duration in seconds
 * @param autoStart - Whether to start animation automatically (default: false)
 * @param repeat - Number of times to repeat (-1 for infinite, 0 for once, default: 0)
 */
export function useSharedAnimation(
    duration: number = 10,
    autoStart: boolean = false,
    repeat: number = 0
) {
    const animValueRef = useRef<SharedAnimationValue>({ value: 0 });
    const tweenRef = useRef<gsap.core.Tween | null>(null);

    const start = useCallback(() => {
        // Kill existing animation if any
        if (tweenRef.current) {
            tweenRef.current.kill();
        }

        // Start new animation
        tweenRef.current = gsap.to(animValueRef.current, {
            value: 1,
            duration,
            repeat,
            onComplete: () => {
                tweenRef.current = null;
            },
        });
    }, [duration, repeat]);

    const stop = useCallback(() => {
        if (tweenRef.current) {
            tweenRef.current.kill();
            tweenRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        stop();
        animValueRef.current.value = 0;
    }, [stop]);

    const restart = useCallback(() => {
        reset();
        start();
    }, [reset, start]);

    // Auto-start if enabled
    useEffect(() => {
        if (autoStart) {
            start();
        }

        // Cleanup on unmount
        return () => {
            stop();
        };
    }, [autoStart, start, stop]);

    // Expose controls via ref
    const controlsRef = useRef<SharedAnimationControls>({
        start,
        stop,
        reset,
        restart,
    });

    // Update controls ref when functions change
    useEffect(() => {
        controlsRef.current = { start, stop, reset, restart };
    }, [start, stop, reset, restart]);

    return { animValueRef, controls: controlsRef.current };
}


import { useRef, useEffect } from "react";
import { gsap } from "gsap";

export interface SharedAnimationValue {
    value: number;
}

/**
 * Shared animation hook that creates a single animation value synchronized across components
 * Returns a ref object that can be passed to multiple components
 */
export function useSharedAnimation(duration: number = 10) {
    const animValueRef = useRef<SharedAnimationValue>({ value: 0 });

    // GSAP animation: value goes from 0 to 1
    useEffect(() => {
        gsap.to(animValueRef.current, {
            value: 1,
            duration,
        });
    }, [duration]);

    return animValueRef;
}


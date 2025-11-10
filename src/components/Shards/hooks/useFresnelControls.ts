import { useControls } from "leva";
import { useMemo } from "react";
import type { FresnelConfig } from "../utils";

/**
 * Hook for fresnel controls with customizable prefix
 */
export function useFresnelControls(prefix: string = "Shard") {
    const materialFresnel = useControls(`${prefix}.Material.Fresnel`, {
        enabled: { value: true },
        power: { value: 2.5, min: 0.1, max: 5.0, step: 0.1 },
        intensity: { value: 0.45, min: 0, max: 2.0, step: 0.01 },
        color: { value: '#7b5ca3' },
    }, { collapsed: true });

    const fresnelConfig = useMemo<FresnelConfig>(() => ({
        enabled: materialFresnel.enabled,
        power: materialFresnel.power,
        intensity: materialFresnel.intensity,
        color: materialFresnel.color,
    }), [materialFresnel]);

    return fresnelConfig;
}


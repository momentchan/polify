import { useControls } from "leva";
import { useMemo } from "react";
import type { ExtrudeSettings } from "../utils";

/**
 * Hook for extrude settings controls with customizable prefix
 */
export function useExtrudeControls(prefix: string = "Shard") {
    const extrudeSettings = useControls(`${prefix}.Extrude`, {
        depth: { value: 0.02, min: 0, max: 0.1, step: 0.01 },
        bevelEnabled: { value: true },
        bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
    }, { collapsed: true });

    const extrudeConfig = useMemo<ExtrudeSettings>(() => ({
        depth: extrudeSettings.depth,
        bevelEnabled: extrudeSettings.bevelEnabled,
        bevelThickness: extrudeSettings.bevelThickness,
        bevelSize: extrudeSettings.bevelSize,
        bevelSegments: extrudeSettings.bevelSegments,
    }), [extrudeSettings]);

    return extrudeConfig;
}


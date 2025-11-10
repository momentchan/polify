import { useMemo } from "react";
import * as THREE from "three";
import { createExtrudeSettings, createShardGeometry, type ExtrudeSettings } from "../utils";

type SVGPath = {
    toShapes: (isCCW: boolean) => THREE.Shape[];
};

/**
 * Hook to create shard geometry from SVG paths and extrude settings
 */
export function useShardGeometry(paths: SVGPath[], extrudeConfig: ExtrudeSettings) {
    return useMemo(() => {
        const settings = createExtrudeSettings(extrudeConfig);
        return createShardGeometry(paths, settings);
    }, [paths, extrudeConfig]);
}


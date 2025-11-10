import { useLoader } from "@react-three/fiber";
import { SVGLoader, type SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";

/**
 * Hook to load SVG shape paths
 */
export function useShardShape(shapePath: string) {
    const { paths } = useLoader(SVGLoader, shapePath) as SVGResult;
    return paths;
}


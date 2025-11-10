import { useControls } from "leva";

export interface MaterialBaseControls {
    roughness: number;
    metalness: number;
    transmission: number;
    thickness: number;
    ior: number;
    clearcoat: number;
    clearcoatRoughness: number;
    reflectivity: number;
    envMapIntensity: number;
    sheen: number;
    sheenRoughness: number;
    sheenColor: string;
    iridescence: number;
    iridescenceIOR: number;
    attenuationDistance: number;
    attenuationColor: string;
    bumpScale: number;
}

/**
 * Hook for material base controls with customizable prefix
 */
export function useMaterialControls(prefix: string = "Shard"): MaterialBaseControls {
    return useControls(`${prefix}.Material.Base`, {
        roughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
        metalness: { value: 0.25, min: 0, max: 1, step: 0.01 },
        transmission: { value: 0.0, min: 0, max: 1, step: 0.01 },
        thickness: { value: 0.0, min: 0, max: 10, step: 0.1 },
        ior: { value: 1.5, min: 1, max: 2.5, step: 0.01 },
        clearcoat: { value: 1.0, min: 0, max: 1, step: 0.01 },
        clearcoatRoughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
        reflectivity: { value: 1.0, min: 0, max: 1, step: 0.01 },
        envMapIntensity: { value: 1.0, min: 0, max: 10, step: 0.1 },
        sheen: { value: 0.0, min: 0, max: 1, step: 0.01 },
        sheenRoughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        sheenColor: { value: '#ffffff' },
        iridescence: { value: 1.0, min: 0, max: 1, step: 0.01 },
        iridescenceIOR: { value: 1.3, min: 1, max: 2.5, step: 0.01 },
        attenuationDistance: { value: 0.0, min: 0, max: 10, step: 0.1 },
        attenuationColor: { value: '#ffffff' },
        bumpScale: { value: 1.0, min: 0, max: 10, step: 0.1 },
    }, { collapsed: true });
}


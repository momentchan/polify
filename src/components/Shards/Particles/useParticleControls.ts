import { useControls } from "leva";
import { useMemo } from "react";
import type { ExtrudeSettings, FresnelConfig } from "../shardMirrorUtils";

export function useParticleControls() {
    const extrudeSettings = useControls('Particles.Extrude', {
        depth: { value: 0.02, min: 0, max: 0.1, step: 0.01 },
        bevelEnabled: { value: true },
        bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
    }, { collapsed: true });

    const materialBase = useControls('Particles.Material.Base', {
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

    const materialTexture = useControls('Particles.Material.Texture', {
        scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true });

    const materialFresnel = useControls('Particles.Material.Fresnel', {
        enabled: { value: true },
        power: { value: 2.5, min: 0.1, max: 5.0, step: 0.1 },
        intensity: { value: 0.45, min: 0, max: 2.0, step: 0.01 },
        color: { value: '#7b5ca3' },
    }, { collapsed: true });

    const extrudeConfig = useMemo<ExtrudeSettings>(() => ({
        depth: extrudeSettings.depth,
        bevelEnabled: extrudeSettings.bevelEnabled,
        bevelThickness: extrudeSettings.bevelThickness,
        bevelSize: extrudeSettings.bevelSize,
        bevelSegments: extrudeSettings.bevelSegments,
    }), [extrudeSettings]);

    const fresnelConfig = useMemo<FresnelConfig>(() => ({
        enabled: materialFresnel.enabled,
        power: materialFresnel.power,
        intensity: materialFresnel.intensity,
        color: materialFresnel.color,
    }), [materialFresnel]);

    return {
        extrudeConfig,
        materialBase,
        materialTexture,
        fresnelConfig,
    };
}


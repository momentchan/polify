import { useControls } from "leva";
import { useExtrudeControls, useFresnelControls, type MaterialBaseControls } from "../hooks";

export function useParticleControls() {
    const extrudeConfig = useExtrudeControls("Particles");
    
    // Particle-specific material controls with custom defaults
    const materialBase: MaterialBaseControls = useControls('Particles.Material.Base', {
        roughness: { value: 1, min: 0, max: 1, step: 0.01 },
        metalness: { value: 0.6, min: 0, max: 1, step: 0.01 },
        transmission: { value: 0.0, min: 0, max: 1, step: 0.01 },
        thickness: { value: 0.0, min: 0, max: 10, step: 0.1 },
        ior: { value: 1.5, min: 1, max: 2.5, step: 0.01 },
        clearcoat: { value: 0, min: 0, max: 1, step: 0.01 },
        clearcoatRoughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
        reflectivity: { value: 1.0, min: 0, max: 1, step: 0.01 },
        envMapIntensity: { value: 2.0, min: 0, max: 10, step: 0.1 },
        sheen: { value: 1, min: 0, max: 1, step: 0.01 },
        sheenRoughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        sheenColor: { value: '#ffffff' },
        iridescence: { value: 1.0, min: 0, max: 1, step: 0.01 },
        iridescenceIOR: { value: 1.3, min: 1, max: 2.5, step: 0.01 },
        attenuationDistance: { value: 0.0, min: 0, max: 10, step: 0.1 },
        attenuationColor: { value: '#ffffff' },
        bumpScale: { value: 1.0, min: 0, max: 10, step: 0.1 },
    }, { collapsed: true });
    
    const fresnelConfig = useFresnelControls("Particles");

    const materialTexture = useControls('Particles.Material.Texture', {
        scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true });

    return {
        extrudeConfig,
        materialBase,
        materialTexture,
        fresnelConfig,
    };
}


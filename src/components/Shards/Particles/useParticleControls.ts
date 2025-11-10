import { useControls } from "leva";
import { useExtrudeControls, useMaterialControls, useFresnelControls } from "../hooks";

export function useParticleControls() {
    const extrudeConfig = useExtrudeControls("Particles");
    const materialBase = useMaterialControls("Particles");
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


import { useEffect } from "react";
import * as THREE from "three";
import type { MaterialBaseControls } from "./useMaterialControls";

/**
 * Hook to update material properties from controls
 */
export function useMaterialProperties(
    material: THREE.Material,
    controls: MaterialBaseControls
) {
    useEffect(() => {
        const physicalMaterial = material as unknown as THREE.MeshPhysicalMaterial & {
            sheenColor: THREE.Color;
            attenuationColor: THREE.Color;
        };

        physicalMaterial.roughness = controls.roughness;
        physicalMaterial.metalness = controls.metalness;
        physicalMaterial.transmission = controls.transmission;
        physicalMaterial.thickness = controls.thickness;
        physicalMaterial.ior = controls.ior;
        physicalMaterial.clearcoat = controls.clearcoat;
        physicalMaterial.clearcoatRoughness = controls.clearcoatRoughness;
        physicalMaterial.reflectivity = controls.reflectivity;
        physicalMaterial.envMapIntensity = controls.envMapIntensity;
        physicalMaterial.sheen = controls.sheen;
        physicalMaterial.sheenRoughness = controls.sheenRoughness;
        physicalMaterial.sheenColor.set(controls.sheenColor);
        physicalMaterial.iridescence = controls.iridescence;
        physicalMaterial.iridescenceIOR = controls.iridescenceIOR;
        physicalMaterial.attenuationDistance = controls.attenuationDistance;
        physicalMaterial.attenuationColor.set(controls.attenuationColor);
        physicalMaterial.bumpScale = controls.bumpScale;
        physicalMaterial.needsUpdate = true;
    }, [material, controls]);
}


import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createParticleUniforms, type ParticleMaterialUniforms, updateParticleFresnelUniforms, type FresnelConfig } from '../utils';
import { createParticleMaterial as createMaterial } from './particleMaterial';

interface UseParticleMaterialProps {
    scratchTex: THREE.Texture;
    fresnelConfig: FresnelConfig;
    scratchBlend: number;
    instanceCount: number;
}

interface UseParticleMaterialReturn {
    material: ReturnType<typeof createMaterial>;
    updateMaterialProperties: (props: MaterialProperties) => void;
}

interface MaterialProperties {
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

export function useParticleMaterial({
    scratchTex,
    fresnelConfig,
    scratchBlend,
    instanceCount,
}: UseParticleMaterialProps): UseParticleMaterialReturn {
    // Initialize uniforms
    const uniforms = useMemo<ParticleMaterialUniforms>(() => {
        return createParticleUniforms(
            scratchTex,
            fresnelConfig,
            scratchBlend,
            instanceCount
        );
    }, [scratchTex, fresnelConfig, scratchBlend, instanceCount]);

    // Create material instance
    const material = useMemo(() => {
        return createMaterial(uniforms);
    }, [uniforms]);

    // Update fresnel uniforms when controls change
    useEffect(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        updateParticleFresnelUniforms(materialUniforms, fresnelConfig);
    }, [material, fresnelConfig]);

    // Update scratch blend when control changes
    useEffect(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.uScratchBlend.value = scratchBlend;
    }, [material, scratchBlend]);

    // Function to update material properties
    const updateMaterialProperties = (props: MaterialProperties) => {
        const physicalMaterial = material as unknown as THREE.MeshPhysicalMaterial & {
            sheenColor: THREE.Color;
            attenuationColor: THREE.Color;
        };

        physicalMaterial.roughness = props.roughness;
        physicalMaterial.metalness = props.metalness;
        physicalMaterial.transmission = props.transmission;
        physicalMaterial.thickness = props.thickness;
        physicalMaterial.ior = props.ior;
        physicalMaterial.clearcoat = props.clearcoat;
        physicalMaterial.clearcoatRoughness = props.clearcoatRoughness;
        physicalMaterial.reflectivity = props.reflectivity;
        physicalMaterial.envMapIntensity = props.envMapIntensity;
        physicalMaterial.sheen = props.sheen;
        physicalMaterial.sheenRoughness = props.sheenRoughness;
        physicalMaterial.sheenColor.set(props.sheenColor);
        physicalMaterial.iridescence = props.iridescence;
        physicalMaterial.iridescenceIOR = props.iridescenceIOR;
        physicalMaterial.attenuationDistance = props.attenuationDistance;
        physicalMaterial.attenuationColor.set(props.attenuationColor);
        physicalMaterial.bumpScale = props.bumpScale;
        physicalMaterial.needsUpdate = true;
    };

    return { material, updateMaterialProperties };
}


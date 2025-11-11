import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createParticleUniforms, type ParticleMaterialUniforms, updateParticleFresnelUniforms, type FresnelConfig } from '../utils';
import { getSharedParticleMaterial } from './particleMaterial';

interface UseParticleMaterialProps {
    scratchTex: THREE.Texture;
    fresnelConfig: FresnelConfig;
    scratchBlend: number;
    instanceCount: number;
    sizeMultiplier?: number;
    fresnelColor?: string;
}

interface UseParticleMaterialReturn {
    material: ReturnType<typeof getSharedParticleMaterial>;
    uniformsRef: React.MutableRefObject<ParticleMaterialUniforms>;
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
    sizeMultiplier = 0.3,
}: UseParticleMaterialProps): UseParticleMaterialReturn {
    // Initialize uniforms
    const uniforms = useMemo<ParticleMaterialUniforms>(() => {
        const uniform = createParticleUniforms(
            scratchTex,
            fresnelConfig,
            scratchBlend,
            instanceCount
        );
        uniform.sizeMultiplier.value = sizeMultiplier;
        return uniform;
    }, [scratchTex, fresnelConfig, scratchBlend, instanceCount, sizeMultiplier]);

    // Store uniforms in ref for onBeforeRender updates
    const uniformsRef = useRef(uniforms);
    useEffect(() => {
        uniformsRef.current = uniforms;
    }, [uniforms]);

    // Create shared material instance (singleton pattern like ShardMirror)
    const material = useMemo(() => {
        return getSharedParticleMaterial(uniforms);
    }, [uniforms]);

    // Update fresnel uniforms when controls change (update ref, not material directly)
    useEffect(() => {
        updateParticleFresnelUniforms(uniformsRef.current, fresnelConfig);
    }, [fresnelConfig]);

    // Update scratch blend when control changes (update ref, not material directly)
    useEffect(() => {
        uniformsRef.current.uScratchBlend.value = scratchBlend;
    }, [scratchBlend]);

    // Update size multiplier when prop changes (update ref, not material directly)
    useEffect(() => {
        uniformsRef.current.sizeMultiplier.value = sizeMultiplier;
    }, [sizeMultiplier]);

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

    return { material, uniformsRef, updateMaterialProperties };
}


import { ParticleSystem, RandomSpherePositionConfig } from "@packages/particle-system";
import { useMemo, useRef, useEffect } from "react";
import { 
    createExtrudeSettings, 
    createShardGeometry,
    type ParticleMaterialUniforms
} from "../shardMirrorUtils";
import { SVGLoader, SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import { CustomRadialVelocityConfig } from "./CustomRadialVelocityConfig";
import { useParticleControls } from "./useParticleControls";
import { useParticleMaterial } from "./useParticleMaterial";
import { useParticleAnimation } from "./useParticleAnimation";

interface ParticlesProps {
    shapePath?: string;
    count?: number;
}

export default function Particles({ 
    shapePath = 'textures/shape1.svg',
    count = 128 
}: ParticlesProps) {
    const { paths } = useLoader(SVGLoader, shapePath) as SVGResult;
    const scratchTex = useTexture('/textures/scratch.jpg');
    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null!);

    // Controls
    const { extrudeConfig, materialBase, materialTexture, fresnelConfig } = useParticleControls();

    // Particle configuration
    const config = useMemo(() => ({
        position: new RandomSpherePositionConfig(0.05, [0, 0, 0]),
        velocity: new CustomRadialVelocityConfig(2, [0, 0, 0], 0.3),
    }), []);

    // Geometry
    const geometry = useMemo(() => {
        const settings = createExtrudeSettings(extrudeConfig);
        return createShardGeometry(paths, settings);
    }, [paths, extrudeConfig]);

    // Material
    const { material, updateMaterialProperties } = useParticleMaterial({
        scratchTex,
        fresnelConfig,
        scratchBlend: materialTexture.scratchBlend,
        instanceCount: count,
    });

    // Update material properties when controls change
    useEffect(() => {
        updateMaterialProperties(materialBase);
    }, [material, updateMaterialProperties, materialBase]);

    // Behavior
    const behavior = useMemo(() => {
        const b = new AnimatedDampingBehavior(1.0);
        b.dampingUniform.value = 1.0;
        return b;
    }, []);

    // Animation
    useParticleAnimation({
        behavior,
        material,
        groupRef,
    });

    // Update camera position for fresnel
    useFrame(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.uCamPos.value.copy(camera.position);
    });

    if (!material || !geometry || !behavior) return null;

    return (
        <group ref={groupRef}>
        <ParticleSystem count={count}
            config={config}
            behavior={behavior}
            meshType="instanced"
            customMaterial={material}
            instanceGeometry={geometry}
        />
        </group>
    );
}
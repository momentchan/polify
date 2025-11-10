import { ParticleSystem, RandomSpherePositionConfig } from "@packages/particle-system";
import { useMemo, useRef } from "react";
import { type ParticleMaterialUniforms } from "../utils";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { AnimatedDampingBehavior } from "./AnimatedDampingBehavior";
import { CustomRadialVelocityConfig } from "./CustomRadialVelocityConfig";
import { useParticleControls } from "./useParticleControls";
import { useParticleMaterial } from "./useParticleMaterial";
import { useParticleAnimation } from "./useParticleAnimation";
import { useShardShape, useShardGeometry, useMaterialProperties, type SharedAnimationValue } from "../hooks";

interface ShardParticlesProps {
    shapePath?: string;
    count?: number;
    animValueRef?: React.RefObject<SharedAnimationValue>;
}

export default function ShardParticles({ 
    shapePath = 'textures/shape1.svg',
    count = 128,
    animValueRef: externalAnimValueRef
}: ShardParticlesProps) {
    const paths = useShardShape(shapePath);
    const scratchTex = useTexture('/textures/scratch.jpg');
    const { camera } = useThree();

    // Controls
    const { extrudeConfig, materialBase, materialTexture, fresnelConfig } = useParticleControls();

    // Particle configuration
    const config = useMemo(() => ({
        position: new RandomSpherePositionConfig(0.05, [0, 0, 0]),
        velocity: new CustomRadialVelocityConfig(2, [0, 0, 0], 0.3),
    }), []);

    // Geometry
    const geometry = useShardGeometry(paths, extrudeConfig);

    // Material
    const { material } = useParticleMaterial({
        scratchTex,
        fresnelConfig,
        scratchBlend: materialTexture.scratchBlend,
        instanceCount: count,
    });

    // Update material properties when controls change
    useMaterialProperties(material, materialBase);

    // Behavior
    const behavior = useMemo(() => {
        const b = new AnimatedDampingBehavior(1.0);
        b.dampingUniform.value = 1.0;
        return b;
    }, []);

    // Animation - use external ref if provided, otherwise create internal one
    const internalAnimValueRef = useRef<SharedAnimationValue>({ value: 0 });
    const animValueRef = externalAnimValueRef || internalAnimValueRef;

    useParticleAnimation({
        behavior,
        material,
        animValueRef,
    });

    // Update camera position for fresnel
    useFrame(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        materialUniforms.uCamPos.value.copy(camera.position);
    });

    if (!material || !geometry || !behavior) return null;

    return (
        <group>
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


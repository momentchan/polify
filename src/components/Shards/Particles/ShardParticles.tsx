import { ParticleSystem, RandomSpherePositionConfig } from "@packages/particle-system";
import { useMemo, useRef, useEffect } from "react";
import { type ParticleMaterialUniforms, copyParticleUniformValues } from "../utils";
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
    sizeMultiplier?: number;
    fresnelColor?: string;
}

export default function ShardParticles({ 
    shapePath = 'textures/shape1.svg',
    count = 128,
    animValueRef: externalAnimValueRef,
    sizeMultiplier = 0.3,
    fresnelColor
}: ShardParticlesProps) {
    const paths = useShardShape(shapePath);
    const scratchTex = useTexture('/textures/scratch.jpg');
    const { camera } = useThree();

    // Controls
    const { extrudeConfig, materialBase, materialTexture, fresnelConfig } = useParticleControls();

    // Particle configuration - super explosion with high initial velocity
    const config = useMemo(() => ({
        position: new RandomSpherePositionConfig(0.01, [0, 0, 0]),
        velocity: new CustomRadialVelocityConfig(10, [0, 0, 0], 0.1),
    }), []);

    // Geometry
    const geometry = useShardGeometry(paths, extrudeConfig);

    // Material
    const { material, uniformsRef } = useParticleMaterial({
        scratchTex,
        fresnelConfig,
        scratchBlend: materialTexture.scratchBlend,
        instanceCount: count,
        sizeMultiplier,
        fresnelColor,
    });

    // Update material properties when controls change
    useMaterialProperties(material, materialBase);

    // Set up onBeforeRender to copy uniforms from ref to shared material
    const groupRef = useRef<THREE.Group>(null);
    const particleSystemRef = useRef<{ getParticleTexture: () => THREE.Texture | null; getVelocityTexture: () => THREE.Texture | null; reset: () => void } | null>(null);
    
    // Intercept ParticleSystem's material updates and update our ref
    useFrame((state, delta) => {
        // Copy from material (updated by ParticleSystem) to our ref
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms;
        if (materialUniforms.positionTex?.value) {
            uniformsRef.current.positionTex.value = materialUniforms.positionTex.value;
        }
        if (materialUniforms.velocityTex?.value) {
            uniformsRef.current.velocityTex.value = materialUniforms.velocityTex.value;
        }
        uniformsRef.current.time.value = state.clock.elapsedTime;
        // Delta is already scaled in useParticleAnimation, so use the scaled version from material
        uniformsRef.current.delta.value = materialUniforms.delta?.value ?? delta;
        uniformsRef.current.instanceCount.value = count;
    });

    // Set up onBeforeRender on the InstancedMesh to copy uniforms from ref to shared material
    useEffect(() => {
        if (!groupRef.current) return;

        const findAndSetupMesh = () => {
            let instancedMesh: THREE.InstancedMesh | null = null;
            groupRef.current?.traverse((child) => {
                if (child instanceof THREE.InstancedMesh && !instancedMesh) {
                    instancedMesh = child;
                }
            });

            if (!instancedMesh) {
                requestAnimationFrame(findAndSetupMesh);
                return;
            }

            const mesh = instancedMesh as THREE.InstancedMesh;
            const previous = mesh.onBeforeRender;
            const handler: THREE.InstancedMesh['onBeforeRender'] = () => {
                const uniformsTarget = material.uniforms as unknown as ParticleMaterialUniforms;
                copyParticleUniformValues(uniformsTarget, uniformsRef.current);
            };

            mesh.onBeforeRender = handler;

            return () => {
                if (mesh.onBeforeRender === handler) {
                    mesh.onBeforeRender = previous;
                }
            };
        };

        return findAndSetupMesh();
    }, [material, uniformsRef]);

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

    // Update camera position for fresnel (update ref, not material directly)
    useFrame(() => {
        uniformsRef.current.uCamPos.value.copy(camera.position);
    });

    if (!material || !geometry || !behavior) return null;

    return (
        <group ref={groupRef}>
        <ParticleSystem 
            ref={particleSystemRef}
            count={count}
            config={config}
            behavior={behavior}
            meshType="instanced"
            customMaterial={material}
            instanceGeometry={geometry}
        />
        </group>
    );
}


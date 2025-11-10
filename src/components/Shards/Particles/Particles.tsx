import { ParticleSystem, RadialVelocityConfig3D, RandomSpherePositionConfig, ParticleBehavior } from "@packages/particle-system";
import { useMemo, useRef, useEffect } from "react";
import { 
    createExtrudeSettings, 
    createShardGeometry, 
    createParticleUniforms,
    updateParticleFresnelUniforms,
    type ExtrudeSettings,
    type FresnelConfig,
    type ParticleMaterialUniforms
} from "../shardMirrorUtils";
import { useControls } from "leva";
import { SVGLoader, SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { createParticleMaterial } from "./particleMaterial";
import { gsap } from 'gsap';
import { MathUtils } from "three";

// Custom behavior for animated damping explosion effect
class AnimatedDampingBehavior extends ParticleBehavior {
    public dampingUniform: { value: number };
    public noiseStrengthUniform: { value: number };
    public noiseScaleUniform: { value: number };
    public animationValueUniform: { value: number };

    constructor(initialDamping: number = 1.0, noiseStrength: number = 0.1, noiseScale: number = 2.0) {
        super();
        this.dampingUniform = { value: initialDamping };
        this.noiseStrengthUniform = { value: noiseStrength };
        this.noiseScaleUniform = { value: noiseScale };
        this.animationValueUniform = { value: 0.0 };
    }

    getName(): string {
        return 'AnimatedDamping';
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            damping: this.dampingUniform,
            noiseStrength: this.noiseStrengthUniform,
            noiseScale: this.noiseScaleUniform,
            animationValue: this.animationValueUniform
        };
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // Apply damping to slow down particles
            vel.xyz *= damping;
            
            // Calculate rotation speed multiplier based on animation value
            // animationValue goes from 0 to 1, we map it to rotation speed multiplier
            float rotationSpeedMultiplier = mix(20.0, 1., smoothstep(0.0, 0.6, animationValue));
            
            // Update rotation accumulator in velocity.w component
            // vel.w stores accumulated rotation multiplier
            // We add delta * rotationSpeedMultiplier each frame
            vel.w += delta * rotationSpeedMultiplier;
        `;
    }
}

export default function Particles() {
    const count = 128;
    const { paths } = useLoader(SVGLoader, 'textures/shape1.svg') as SVGResult
    const scratchTex = useTexture('/textures/scratch.jpg')
    const groupRef = useRef<THREE.Group>(null!);
    const animValueRef = useRef({ value: 0 });

    const {
        depth,
        bevelEnabled,
        bevelThickness,
        bevelSize,
        bevelSegments,
    } = useControls('Particles.Extrude', {
        depth: { value: 0.02, min: 0, max: 0.1, step: 0.01 },
        bevelEnabled: { value: true },
        bevelThickness: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSize: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
        bevelSegments: { value: 3, min: 1, max: 10, step: 1 },
    }, { collapsed: true })

    const {
        roughness,
        metalness,
        transmission,
        thickness,
        ior,
        clearcoat,
        clearcoatRoughness,
        reflectivity,
        envMapIntensity,
        sheen,
        sheenRoughness,
        sheenColor,
        iridescence,
        iridescenceIOR,
        attenuationDistance,
        attenuationColor,
        bumpScale,
    } = useControls('Particles.Material.Base', {
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
    }, { collapsed: true })

    const {
        scratchBlend,
    } = useControls('Particles.Material.Texture', {
        scratchBlend: { value: 0.3, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true })

    const {
        enabled: fresnelEnabled,
        power: fresnelPower,
        intensity: fresnelIntensity,
        color: fresnelColor,
    } = useControls('Particles.Material.Fresnel', {
        enabled: { value: true },
        power: { value: 2.5, min: 0.1, max: 5.0, step: 0.1 },
        intensity: { value: 0.45, min: 0, max: 2.0, step: 0.01 },
        color: { value: '#7b5ca3' },
    }, { collapsed: true })


    const config = useMemo(() => {
        // Create a custom velocity config that initializes rotation accumulator
        class CustomRadialVelocityConfig extends RadialVelocityConfig3D {
            generateVelocity(index: number, totalCount: number, size: number): [number, number, number, number] {
                const [vx, vy, vz, _] = super.generateVelocity(index, totalCount, size);
                // Use 4th component to store initial rotation accumulator (starts at 0)
                return [vx, vy, vz, 0.0];
            }
        }
        
        return {
            position: new RandomSpherePositionConfig(0.05, [0, 0, 0]), // Start particles near center
            velocity: new CustomRadialVelocityConfig(2, [0, 0, 0], 0.3), // Initial outward velocity with rotation accumulator
        };
    }, []);

    const geometry = useMemo(() => {
        const settings: ExtrudeSettings = createExtrudeSettings({
            depth,
            bevelEnabled,
            bevelThickness,
            bevelSize,
            bevelSegments,
        })
        const result = createShardGeometry(paths, settings)
        return result
    }, [paths, depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments])

    // Initialize fresnel config
    const fresnelConfig = useMemo<FresnelConfig>(() => ({
        enabled: fresnelEnabled,
        power: fresnelPower,
        intensity: fresnelIntensity,
        color: fresnelColor,
    }), [fresnelEnabled, fresnelPower, fresnelIntensity, fresnelColor])

    // Initialize uniforms
    const uniforms = useMemo<ParticleMaterialUniforms>(() => {
        return createParticleUniforms(
            scratchTex,
            fresnelConfig,
            scratchBlend,
            count
        )
    }, [scratchTex, fresnelConfig, scratchBlend, count])

    // Create material instance (each particle system needs its own material for unique uniforms)
    const material = useMemo(() => {
        return createParticleMaterial(uniforms)
    }, [uniforms])

    // Update fresnel uniforms when controls change
    useEffect(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms
        updateParticleFresnelUniforms(materialUniforms, fresnelConfig)
    }, [material, fresnelConfig])

    // Update scratch blend when control changes
    useEffect(() => {
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms
        materialUniforms.uScratchBlend.value = scratchBlend
    }, [material, scratchBlend])

    // Update material properties when controls change
    useEffect(() => {
        const physicalMaterial = material as unknown as THREE.MeshPhysicalMaterial & {
            sheenColor: THREE.Color;
            attenuationColor: THREE.Color;
        }

        physicalMaterial.roughness = roughness
        physicalMaterial.metalness = metalness
        physicalMaterial.transmission = transmission
        physicalMaterial.thickness = thickness
        physicalMaterial.ior = ior
        physicalMaterial.clearcoat = clearcoat
        physicalMaterial.clearcoatRoughness = clearcoatRoughness
        physicalMaterial.reflectivity = reflectivity
        physicalMaterial.envMapIntensity = envMapIntensity
        physicalMaterial.sheen = sheen
        physicalMaterial.sheenRoughness = sheenRoughness
        physicalMaterial.sheenColor.set(sheenColor)
        physicalMaterial.iridescence = iridescence
        physicalMaterial.iridescenceIOR = iridescenceIOR
        physicalMaterial.attenuationDistance = attenuationDistance
        physicalMaterial.attenuationColor.set(attenuationColor)
        physicalMaterial.bumpScale = bumpScale
        physicalMaterial.needsUpdate = true
    }, [
        material,
        roughness,
        metalness,
        transmission,
        thickness,
        ior,
        clearcoat,
        clearcoatRoughness,
        reflectivity,
        envMapIntensity,
        sheen,
        sheenRoughness,
        sheenColor,
        iridescence,
        iridescenceIOR,
        attenuationDistance,
        attenuationColor,
        bumpScale,
    ])

    const behavior = useMemo(() => {
        const b = new AnimatedDampingBehavior(1.0); // Start with no damping (1.0)
        // Ensure initial value is explicitly set
        b.dampingUniform.value = 1.0;
        return b;
    }, []);

    // Initialize damping value immediately after mount to ensure GPGPU picks it up
    useEffect(() => {
        // Set immediately and also after a microtask to ensure GPGPU is ready
        behavior.dampingUniform.value = 1.0;
        const timeout = setTimeout(() => {
            behavior.dampingUniform.value = 1.0;
        }, 0);
        return () => clearTimeout(timeout);
    }, [behavior]);

    // GSAP animation: value goes from 0 to 1 in 3 seconds
    useEffect(() => {
        gsap.to(animValueRef.current, {
            value: 1,
            duration: 10,
        });
    }, []);

    const { camera } = useThree();
    
    // Animate damping: no damping for 2s, then increase to max over 1s
    useFrame((state, delta) => {
        const damping = MathUtils.lerp( 1, 0.95, THREE.MathUtils.smoothstep(animValueRef.current.value, 0.3, 0.4));
        // Update damping uniform directly
        behavior.dampingUniform.value = damping;

        const smoothRotationSpeed = MathUtils.lerp( 5, 0.1, THREE.MathUtils.smoothstep(animValueRef.current.value, 0, 0.6)) * 0.2;

        groupRef.current.rotation.y += delta * smoothRotationSpeed;
        
        // Update animation value for velocity shader (via behavior uniform)
        behavior.animationValueUniform.value = animValueRef.current.value
        
        // Update particle-specific uniforms
        const materialUniforms = material.uniforms as unknown as ParticleMaterialUniforms
        materialUniforms.uCamPos.value.copy(camera.position)
        materialUniforms.time.value = state.clock.elapsedTime
        materialUniforms.delta.value = delta
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
import { ParticleSystem, RadialVelocityConfig3D, RandomSpherePositionConfig, ParticleBehavior } from "@packages/particle-system";
import { useMemo, useRef, useEffect } from "react";
import { createExtrudeSettings, createShardGeometry, ExtrudeSettings } from "../shardMirrorUtils";
import { useControls } from "leva";
import { SVGLoader, SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { INSTANCED_VERTEX_SHADER, INSTANCED_FRAGMENT_SHADER } from "./instancedShaders";
import CSM from 'three-custom-shader-material/vanilla'
import { gsap } from 'gsap';
import { MathUtils } from "three";

// Custom behavior for animated damping explosion effect
class AnimatedDampingBehavior extends ParticleBehavior {
    public dampingUniform: { value: number };
    public noiseStrengthUniform: { value: number };
    public noiseScaleUniform: { value: number };

    constructor(initialDamping: number = 1.0, noiseStrength: number = 0.1, noiseScale: number = 2.0) {
        super();
        this.dampingUniform = { value: initialDamping };
        this.noiseStrengthUniform = { value: noiseStrength };
        this.noiseScaleUniform = { value: noiseScale };
    }

    getName(): string {
        return 'AnimatedDamping';
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            damping: this.dampingUniform,
            noiseStrength: this.noiseStrengthUniform,
            noiseScale: this.noiseScaleUniform
        };
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // Apply damping to slow down particles
            vel.xyz *= damping;
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


    const config = useMemo(() => ({
        position: new RandomSpherePositionConfig(0.05, [0, 0, 0]), // Start particles near center
        velocity: new RadialVelocityConfig3D(2, [0, 0, 0], 0.3), // Initial outward velocity with variation
    }), []);

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


    const material = useMemo(() => {
        const mat = new CSM<typeof THREE.MeshPhysicalMaterial>({
            baseMaterial: THREE.MeshPhysicalMaterial,
            vertexShader: INSTANCED_VERTEX_SHADER,
            fragmentShader: INSTANCED_FRAGMENT_SHADER,
            uniforms: {
                positionTex: { value: null },
                velocityTex: { value: null },
                time: { value: 0.0 },
                sizeMultiplier: { value: 0.3 },
                opacity: { value: 0.8 },
                instanceCount: { value: count },
                animationValue: { value: 0 },
                sizeVariation: { value: 0.5 }, // 0.0 = uniform size, 1.0 = 0.5x to 1.5x variation
                uCamPos: { value: new THREE.Vector3() },
                uFresnelPower: { value: 2.0 },
                uFresnelIntensity: { value: 1.0 },
                uFresnelColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                uScratchTex: { value: scratchTex },
                uScratchBlend: { value: 0.3 },
            },
            silent: true,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.25,
            transmission: 0.0,
            thickness: 0.0,
            ior: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.5,
            reflectivity: 1.0,
            envMapIntensity: 1.0,
            sheen: 0.0,
            sheenRoughness: 0.0,
            sheenColor: '#ffffff',
            iridescence: 1.0,
            iridescenceIOR: 1.3,
            attenuationDistance: 0.0,
            attenuationColor: '#ffffff',
            bumpScale: 1.0,
        })
        return mat;
    }, [count]);

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
    useFrame((_state, delta) => {
        const damping = MathUtils.lerp( 1, 0.95, THREE.MathUtils.smoothstep(animValueRef.current.value, 0.3, 0.4));
        // Update damping uniform directly
        behavior.dampingUniform.value = damping;

        const smoothRotationSpeed = MathUtils.lerp( 1, 0.1, THREE.MathUtils.smoothstep(animValueRef.current.value, 0, 0.6)) * 0.2;

        groupRef.current.rotation.y += delta * smoothRotationSpeed;
        material.uniforms.animationValue.value = animValueRef.current.value;
        
        // Update camera position for fresnel
        material.uniforms.uCamPos.value.copy(camera.position);
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
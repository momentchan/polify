import { ParticleSystem, ZeroVelocityConfig, UniformColorConfig, UniformSizeConfig, ParticlePositionConfig, SpherePositionConfig, RandomSpherePositionConfig, ParticleBehavior } from "@packages/particle-system";
import { useMemo } from "react";
import { BoxGeometry } from "three";
import { createExtrudeSettings, createShardGeometry, ExtrudeSettings } from "../shardMirrorUtils";
import { useControls } from "leva";
import { SVGLoader, SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";
import { useLoader } from "@react-three/fiber";
import * as THREE from 'three';
import { INSTANCED_VERTEX_SHADER, INSTANCED_FRAGMENT_SHADER } from "./instancedShaders";
import CSM from 'three-custom-shader-material/vanilla'
import { shardMirrorVertexShader, shardMirrorFragmentShader } from "../shardMirrorShaders";

class CustomBehavior extends ParticleBehavior {
    constructor(
        private attractorPosition: [number, number, number] = [0, 0, 0],
        private strength: number = 0.1,
        private damping: number = 0.99
    ) {
        super();
    }

    getName(): string {
        return 'Attractor';
    }

    getVelocityUniforms(): Record<string, any> {
        return {
            attractorPosition: { value: new THREE.Vector3(...this.attractorPosition) },
            strength: { value: this.strength },
            damping: { value: this.damping }
        };
    }

    protected getVelocityUpdateLogic(): string {
        return /*glsl*/ `
            // Create attractor at specified position
            vec3 force = attractorPosition - pos.xyz;
            float dist = length(force);
            
            if (dist > 0.1) {
                force = normalize(force) * strength / (dist * dist);
            }
            
            vel.xyz += force * delta;
            
            // Apply damping
            vel.xyz *= damping;
        `;
    }
}



export default function Particles() {

    const count = 256;
    const { paths } = useLoader(SVGLoader, 'textures/shape1.svg') as SVGResult

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
        position: new RandomSpherePositionConfig(1, [0, 0, 0]),
        velocity: new ZeroVelocityConfig(),
        color: new UniformColorConfig([1, 1, 1]),
        size: new UniformSizeConfig(1)
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
                sizeMultiplier: { value: 0.1 },
                opacity: { value: 0.8 },
                instanceCount: { value: count }
            },
            silent: true,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            roughness: 0.5 ,
            metalness: 0.25 ,
            transmission: 0.0 ,
            thickness: 0.0 ,
            ior: 1.5 ,
            clearcoat: 1.0 ,
            clearcoatRoughness: 0.5 ,
            reflectivity: 1.0 ,
            envMapIntensity: 1.0 ,
            sheen: 0.0 ,
            sheenRoughness: 0.0 ,
            sheenColor: '#ffffff' ,
            iridescence: 1.0 ,
            iridescenceIOR: 1.3 ,
            attenuationDistance: 0.0 ,
            attenuationColor: '#ffffff' ,
            bumpScale: 1.0 ,
        })
        return mat;
    }, [count]);


    return (
        <ParticleSystem count={count}
            config={config}
            behavior={new CustomBehavior([0, 0, 0], 0.1, 0.99)}
            meshType="instanced"
            customMaterial={material}
            instanceGeometry={geometry}
        />
    )
}
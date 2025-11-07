import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { GradientTexture, GradientType } from "@react-three/drei"
import fractal from "@packages/r3f-gist/shaders/cginc/noise/fractal.glsl"
import simplexNoise from "@packages/r3f-gist/shaders/cginc/noise/simplexNoise.glsl"
import random from "@packages/r3f-gist/shaders/cginc/noise/random.glsl"


export default function BackgroundSphere() {

    const controls = useControls({
        stop3: { value: 0.64, min: 0, max: 1, step: 0.01 },
        stop2: { value: 0.52, min: 0, max: 1, step: 0.01 },
        stop1: { value: 0.39, min: 0, max: 1, step: 0.01 },
        stop0: { value: 0.27, min: 0, max: 1, step: 0.01 },
        color3: { value: '#0d0a14' },
        color2: { value: '#593396' },
        color1: { value: '#db7ab4' },
        color0: { value: '#d11d50' },
        frequency: { value: 4, min: 0, max: 30, step: 0.01 },
        speed: { value: 0.4, min: 0, max: 10, step: 0.01 },
        power: { value: 2, min: 0, max: 3, step: 0.01 },
    })

    const stops = useMemo(() => [controls.stop0, controls.stop1, controls.stop2, controls.stop3], [controls.stop0, controls.stop1, controls.stop2, controls.stop3])
    const colors = useMemo(() => [controls.color0, controls.color1, controls.color2, controls.color3], [controls.color0, controls.color1, controls.color2, controls.color3])
    const { frequency, speed, power } = controls

    const gradientMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)

    const uniforms = useMemo(() => ({
        uGradientTexture: { value: null as THREE.Texture | null },
        uFrequency: { value: frequency },
        uSpeed: { value: speed },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uPower: { value: power },
    }), [])

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vPos;
        void main(){
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: /* glsl */`
        ${simplexNoise}
        ${random}
    
        precision highp float;
        varying vec2 vUv;
        varying vec3 vPos;
        uniform sampler2D uGradientTexture;
        uniform float uFrequency;
        uniform float uSpeed;
        uniform float uTime;
        uniform float uAspect;
        uniform float uPower;
    
    
        void main(){
          vec2 uv = vUv;
          // Bottom to top gradient based on vPos.y (normalized from -1 to 1 -> 0 to 1)
         float n = simplexNoise2d(vPos.x * 0.5 * vec2(uAspect, 1.0));

          float gradientPos = 1.0 - (vPos.y + 1.0) * 0.5 + n * 0.01;

          // Sample gradient texture (x coordinate doesn't matter for linear vertical gradient)
          vec3 gradientCol = texture2D(uGradientTexture, vec2(0.5, gradientPos)).rgb;


          vec3 col = gradientCol;
    
          gl_FragColor = vec4(col, 1.0);
        }
      `
        ,
        side: THREE.BackSide,
    }), [uniforms])


    // Update gradient texture when stops or colors change
    useEffect(() => {
        if (gradientMaterialRef.current?.map) {
            material.uniforms.uGradientTexture.value = gradientMaterialRef.current.map
        }
    }, [stops, colors, material])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
        // Get gradient texture from the material's map property
        if (gradientMaterialRef.current?.map) {
            material.uniforms.uGradientTexture.value = gradientMaterialRef.current.map
        }
        material.uniforms.uFrequency.value = frequency
        material.uniforms.uSpeed.value = speed
        material.uniforms.uAspect.value = state.viewport.aspect
        material.uniforms.uPower.value = power
    })

    return (
        <>
            {/* Hidden plane to hold the gradient texture */}
            <mesh visible={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial ref={gradientMaterialRef}>
                    <GradientTexture
                        stops={stops}
                        colors={colors}
                        size={1024}
                        width={1024}
                        type={GradientType.Linear}
                    />
                </meshBasicMaterial>
            </mesh>
            <mesh scale={30} material={material}>
                <sphereGeometry args={[1, 32, 32]} />
            </mesh>
        </>
    )
}
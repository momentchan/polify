import { useFrame } from "@react-three/fiber"
import { useControls } from "leva"
import { useMemo } from "react"
import * as THREE from "three"
import fractal from "@packages/r3f-gist/shaders/cginc/noise/fractal.glsl"
import random from "@packages/r3f-gist/shaders/cginc/noise/random.glsl"


export default function BackgroundSphere() {

    const { colorA, colorB, frequency, speed, power } = useControls({
        colorA: { value: '#371d8d' },
        colorB: { value: '#ff666c' },
        frequency: { value: 4, min: 0, max: 30, step: 0.01 },
        speed: { value: 0.4, min: 0, max: 10, step: 0.01 },
        power: { value: 2, min: 0, max: 3, step: 0.01 },
    })

    const uniforms = useMemo(() => ({
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
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
        ${fractal}
        ${random}
    
        precision highp float;
        varying vec2 vUv;
        varying vec3 vPos;
        uniform vec3  uColorA;
        uniform vec3  uColorB;
        uniform float uFrequency; // 0..1
        uniform float uSpeed; // 0..1
        uniform float uTime;
        uniform float uAspect;
        uniform float uPower;
    
    
        void main(){
          vec2 uv = vUv;
          // Bottom to top gradient based on vPos.y (normalized from -1 to 1 -> 0 to 1)
          float gradient = smoothstep(0.4, 0.6, (vPos.y + 1.0) * 0.5);

          float n = pow(fbm2(vPos.xy * uFrequency * vec2(uAspect, 1.0), uSpeed * uTime), uPower);
          vec3 col = mix(uColorA, uColorB, n);
          col *= grainNoise(vPos.xy * vec2(uAspect, 1.0), 10000.0, vec2(0.9, 1.0));
          // Blend noise-based color with gradient
          vec3 gradientCol = mix(uColorA, uColorB, gradient);
          col = mix(col, gradientCol, 0.5);
    
          col = mix(uColorB,uColorA, gradient);
    
          gl_FragColor = vec4(col, 1.0);
        }
      `
        ,
        side: THREE.BackSide,
    }), [uniforms])


    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
        material.uniforms.uColorA.value.set(new THREE.Color(colorA))
        material.uniforms.uColorB.value.set(new THREE.Color(colorB))
        material.uniforms.uFrequency.value = frequency
        material.uniforms.uSpeed.value = speed
        material.uniforms.uAspect.value = state.viewport.aspect
        material.uniforms.uPower.value = power
    })

    return (
        <mesh scale={100} material={material}>
            <sphereGeometry args={[1, 32, 32]} />
        </mesh>
    )
}
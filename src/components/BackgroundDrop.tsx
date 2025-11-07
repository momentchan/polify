import { shaderMaterial, useTexture } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import utility from "@packages/r3f-gist/shaders/cginc/math/utility.glsl";
import blending from "@packages/r3f-gist/shaders/cginc/math/blending.glsl";

const ColorGradientMaterial = shaderMaterial(
    {
        map: null as THREE.Texture | null
    },

    // vertex shader
    /*glsl*/`
        ${utility}
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // fragment shader
    /*glsl*/`
    ${blending}
      uniform sampler2D map;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(map, vUv);
        float shape = clamp(smoothstep(0., 0.8, 0.5 - distance(vec2(0.5, 0.0), vUv)), 0.0, 1.0); 
        color.rgb  = mix(color.rgb, BlendScreen(color.rgb, vec3(shape)), shape);

        gl_FragColor = color;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>   
      }
    `
)

// declaratively
extend({ ColorGradientMaterial })

// TypeScript declaration for the extended material
declare module "@react-three/fiber" {
    interface ThreeElements {
        colorGradientMaterial: import("@react-three/fiber").ThreeElement<typeof ColorGradientMaterial>
    }
}

export default function BackgroundDrop(props: React.JSX.IntrinsicElements['mesh']) {
    const map = useTexture("/textures/bg.png");

    return (
        <mesh {...props}>
            <planeGeometry args={[4, 2]} />
            <colorGradientMaterial
                key={ColorGradientMaterial.key}
                map={map ?? null}
            >
                {/* <GradientTexture
                    stops={[0.25, 0.5, 0.7, 0.8, 1]}
                    colors={['#000000', '#2F2250', '#9F59B3', '#FE638D', '#E03F51']}
                    size={1024}
                    width={1024}
                    type={GradientType.Linear}
                /> */}
            </colorGradientMaterial>
        </mesh>
    )
}
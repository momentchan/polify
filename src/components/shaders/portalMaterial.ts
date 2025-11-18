import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, ReactThreeFiber } from "@react-three/fiber";


// 頂點 shader：幾乎照搬你原本的
export const portalVertexShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

// 片段 shader：加入 encodings chunk，使用 linearToOutputTexel
export const portalFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  varying vec2 vUv;


  void main() {
    vec4 color = texture2D(map, vUv);
    gl_FragColor = linearToOutputTexel(color);
  }
`;

// 用 shaderMaterial 定義一個可在 JSX 中使用的材質 class
export const PortalMaterialImpl = shaderMaterial(
  {
    map: null as THREE.Texture | null
  },
  portalVertexShader,
  portalFragmentShader
);

// 讓 r3f 知道有一個新的 JSX tag <portalMaterialImpl />
extend({ PortalMaterialImpl });

// TypeScript：把它加進 JSX intrinsic elements
declare module "@react-three/fiber" {
  interface ThreeElements {
    portalMaterialImpl: ReactThreeFiber.Object3DNode<
      typeof PortalMaterialImpl,
      typeof PortalMaterialImpl
    >;
  }
}

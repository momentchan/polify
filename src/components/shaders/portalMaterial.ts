import * as THREE from "three";
import CSM from "three-custom-shader-material/vanilla";
import blending from '@packages/r3f-gist/shaders/cginc/math/blending.glsl';

// Portal vertex shader - pass-through with world position and normal for fresnel
export const portalVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWpos;
  varying vec3 vWnorml;

  void main() {
    vUv = uv;
    
    // Calculate world position for fresnel
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWpos = worldPos.xyz;
    
    // Transform normal to world space
    vec3 worldNormal = normalize(mat3(normalMatrix) * normal);
    vWnorml = worldNormal;
    
    // Override CSM's csm_Normal for consistent lighting
    csm_Normal = worldNormal;
    
    // CSM requires csm_PositionRaw to be set
    csm_PositionRaw = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Portal fragment shader - add fresnel and scratch effects, then apply portal color
export const portalFragmentShader = /* glsl */ `
${blending}

precision highp float;

uniform sampler2D map;
uniform vec3 uCamPos;
uniform float uFresnelPower;
uniform float uFresnelIntensity;
uniform vec3 uFresnelColor;
uniform sampler2D uScratchTex;
uniform float uScratchBlend;
uniform float uTransitionRatio;

varying vec2 vUv;
varying vec3 vWpos;
varying vec3 vWnorml;

void main() {
  // Start with base color (can be modified by effects)
  vec3 baseColor = vec3(0.2, 0.2, 0.2);
  
  // Calculate fresnel effect
  vec3 view = normalize(uCamPos - vWpos);
  vec3 nml = normalize(vWnorml);
  float fresnel = pow(1.0 - max(dot(view, nml), 0.0), uFresnelPower);
  vec3 fresnelColor = uFresnelColor * fresnel * uFresnelIntensity;
  
  // Add fresnel to base color
  vec3 col = baseColor + fresnelColor;
  
  // Apply scratch texture (if available)
  if (uScratchBlend > 0.0) {
    vec4 scratch = texture2D(uScratchTex, vUv);
    float gray = dot(scratch.rgb, vec3(0.299, 0.587, 0.114));
    vec3 scratchGray = vec3(gray);
    col = mix(col, BlendScreen(col, scratchGray), uScratchBlend);
  }
  
  // Clamp color to prevent HDR overflow that causes bloom flickering
  col = clamp(col, vec3(0.0), vec3(65504.));
  
  // Finally, apply portal texture (map) - this is the main portal color
  vec4 portalColor = texture2D(map, vUv);
  
  // Mix the effects with portal color (you can adjust the blend ratio)
  // For now, use portal color as the main color, with effects as additive
  vec3 finalColor = portalColor.rgb  + col * 0.3; // Effects add 30% to portal color
  
  // Apply portal texture's alpha
  csm_DiffuseColor = vec4(finalColor, portalColor.a);
}
`;

// Portal material uniforms type
export interface PortalMaterialUniforms {
  map: { value: THREE.Texture | null };
  uCamPos: { value: THREE.Vector3 };
  uFresnelPower: { value: number };
  uFresnelIntensity: { value: number };
  uFresnelColor: { value: THREE.Color };
  uScratchTex: { value: THREE.Texture | null };
  uScratchBlend: { value: number };
  uTransitionRatio: { value: number }; // 0.0 = far from portal, 1.0 = at portal
}

// Create portal material factory function (similar to shard material)
let sharedPortalMaterial: CSM<typeof THREE.MeshPhysicalMaterial> | null = null;

export function getPortalMaterial(
  map: THREE.Texture | null,
  scratchTex: THREE.Texture | null = null,
  fresnelConfig?: { power: number; intensity: number; color: string },
  scratchBlend: number = 0.3
): CSM<typeof THREE.MeshPhysicalMaterial> {
  if (sharedPortalMaterial && map) {
    // Update uniforms if material already exists
    const uniforms = sharedPortalMaterial.uniforms as any;
    if (uniforms.map) {
      uniforms.map.value = map;
    }
    if (scratchTex && uniforms.uScratchTex) {
      uniforms.uScratchTex.value = scratchTex;
    }
    if (fresnelConfig) {
      if (uniforms.uFresnelPower) uniforms.uFresnelPower.value = fresnelConfig.power;
      if (uniforms.uFresnelIntensity) uniforms.uFresnelIntensity.value = fresnelConfig.intensity;
      if (uniforms.uFresnelColor) uniforms.uFresnelColor.value.set(fresnelConfig.color);
    }
    if (uniforms.uScratchBlend) {
      uniforms.uScratchBlend.value = scratchBlend;
    }
    return sharedPortalMaterial;
  }

  // Create a default white texture if scratchTex is not provided
  const defaultScratchTex = scratchTex || (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  })();

  const uniforms: PortalMaterialUniforms = {
    map: { value: map },
    uCamPos: { value: new THREE.Vector3() },
    uFresnelPower: { value: fresnelConfig?.power ?? 2.5 },
    uFresnelIntensity: { value: fresnelConfig?.intensity ?? 0.45 },
    uFresnelColor: { value: new THREE.Color(fresnelConfig?.color ?? '#7b5ca3') },
    uScratchTex: { value: defaultScratchTex },
    uScratchBlend: { value: scratchBlend },
    uTransitionRatio: { value: 0.0 }, // Start at 0.0 (far from portal)
  };

  // Create base material with same settings as shard material
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 1,
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
    sheenColor: new THREE.Color('#ffffff'),
    iridescence: 1.0,
    iridescenceIOR: 1.3,
    attenuationDistance: 0.0,
    attenuationColor: new THREE.Color('#ffffff'),
    bumpScale: 1.0,
    transparent: false,
    side: THREE.DoubleSide,
  });

  sharedPortalMaterial = new CSM<typeof THREE.MeshPhysicalMaterial>({
    baseMaterial, // Use configured base material
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
    uniforms: uniforms as any, // CSM expects a more flexible uniform type
  });

  return sharedPortalMaterial;
}

// Export for use in components
export { sharedPortalMaterial as PortalMaterialImpl };

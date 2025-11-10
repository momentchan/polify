import utility from '@packages/r3f-gist/shaders/cginc/math/utility.glsl'
import blending from '@packages/r3f-gist/shaders/cginc/math/blending.glsl'

// Vertex shader for instanced mesh rendering
export const INSTANCED_VERTEX_SHADER = /*glsl*/ `
uniform sampler2D positionTex;
uniform sampler2D velocityTex;
uniform float time;
uniform float delta;
uniform float sizeMultiplier;
uniform float instanceCount;
uniform float sizeVariation; // 0.0 = no variation, 1.0 = full variation (0.5 to 1.5x)

varying vec3 vWpos;
varying vec3 vWnorml;
varying vec2 vUv;

${utility}

// Random function using instance ID as seed
float randomFromId(float id) {
  return fract(sin(id * 12.9898) * 43758.5453);
}

vec3 randomRotationFromId(float id) {
  float r1 = randomFromId(id);
  float r2 = randomFromId(id + 1000.0);
  float r3 = randomFromId(id + 2000.0);
  // Map to rotation range: -PI to PI for full rotation
  return vec3(
    (r1 - 0.5) * 6.28318, // X rotation: -PI to PI
    (r2 - 0.5) * 6.28318, // Y rotation: -PI to PI
    (r3 - 0.5) * 6.28318  // Z rotation: -PI to PI
  );
}

vec3 randomRotationSpeedFromId(float id) {
  float s1 = randomFromId(id + 3000.0);
  float s2 = randomFromId(id + 4000.0);
  float s3 = randomFromId(id + 5000.0);
  // Map to normalized rotation speed multipliers: -1 to 1
  // These will be multiplied by vel.w (accumulated rotation multiplier) in the vertex shader
  return vec3(
    (s1 - 0.5) * 2.0, // X rotation speed multiplier
    (s2 - 0.5) * 2.0, // Y rotation speed multiplier
    (s3 - 0.5) * 2.0  // Z rotation speed multiplier
  );
}

float randomSizeFromId(float id) {
  float r = randomFromId(id + 6000.0);
  // Map to size range: (1.0 - sizeVariation) to (1.0 + sizeVariation)
  // e.g., if sizeVariation = 0.5, range is 0.5 to 1.5
  return .5 + (r - 0.5) * 1.0 * sizeVariation;
}

void main() {
  // Calculate UV from instance ID (WebGL 2.0)
  float instanceId = float(gl_InstanceID);
  float textureSize = floor(sqrt(instanceCount));
  float u = (mod(instanceId, textureSize) + 0.5) / textureSize;
  float v = (floor(instanceId / textureSize) + 0.5) / textureSize;
  vec2 particleUV = vec2(u, v);
  
  vec4 pos = texture2D(positionTex, particleUV);
  vec4 vel = texture2D(velocityTex, particleUV);
  
  // Get random base rotation based on instance ID
  vec3 randomRot = randomRotationFromId(instanceId);
  
  // Get random rotation speed multipliers based on instance ID
  // These are normalized values that will be multiplied by vel.w
  vec3 rotationSpeed = randomRotationSpeedFromId(instanceId);
  
  // vel.w contains accumulated rotation multiplier (updated in velocity shader with delta * speedMultiplier)
  // Multiply random rotation speeds by accumulated multiplier for final rotation
  vec3 accumulatedRotation = rotationSpeed * vel.w;
  
  // Combine base rotation with accumulated rotation
  vec3 finalRot = randomRot + accumulatedRotation;
  
  // Create rotation matrix from combined euler angles
  mat4 rotMat = eulerAnglesToRotationMatrix(finalRot);
  
  // Get random size based on instance ID
  float randomSize = randomSizeFromId(instanceId);
  
  // Scale the base geometry position with random size variation
  vec3 lpos = position * sizeMultiplier * randomSize;
  
  // Apply rotation to local position
  vec3 rotatedPos = (rotMat * vec4(lpos, 1.0)).xyz;
  
  // Add particle world position from texture
  vec3 newPos = rotatedPos + pos.xyz;
  
  // Transform by instance matrix (identity in our case, but needed for CSM)
  vec4 instancePos = instanceMatrix * vec4(newPos, 1.0);
  
  // Calculate world position for fresnel (before projection)
  vec4 worldPos = modelMatrix * instancePos;
  vWpos = worldPos.xyz;
  
  // Transform normal to world space (CSM may already define objectNormal/transformedNormal)
  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vWnorml = worldNormal;
  
  // Pass UV coordinates (use the actual UV attribute)
  vUv = uv;
  
  // CSM requires full transformation chain
  csm_PositionRaw = projectionMatrix * modelViewMatrix * instancePos;
}
`;

// Fragment shader for instanced mesh
export const INSTANCED_FRAGMENT_SHADER = /*glsl*/ `
${blending}

precision highp float;

varying vec3 vWpos;
varying vec3 vWnorml;
varying vec2 vUv;

uniform vec3 uCamPos;
uniform float uFresnelPower;
uniform float uFresnelIntensity;
uniform vec3 uFresnelColor;
uniform sampler2D uScratchTex;
uniform float uScratchBlend;

void main() {
  vec3 baseColor = vec3(0.2, 0.2, 0.2);
  
  // Calculate fresnel effect
  vec3 view = normalize(uCamPos - vWpos);
  vec3 nml = normalize(vWnorml);
  float fresnel = pow(1.0 - max(dot(view, nml), 0.0), uFresnelPower);
  vec3 fresnelColor = uFresnelColor * fresnel * uFresnelIntensity;
  
  // Add fresnel to base color
  vec3 col = baseColor + fresnelColor;
  
  // Apply scratch texture
  vec4 scratch = texture2D(uScratchTex, vUv);
  float gray = dot(scratch.rgb, vec3(0.299, 0.587, 0.114));
  vec3 scratchGray = vec3(gray);
  
  col = mix(col, BlendScreen(col, scratchGray), uScratchBlend);
  
  csm_DiffuseColor = vec4(col, 1.0);
}
`;

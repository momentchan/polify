import utility from '@packages/r3f-gist/shaders/cginc/math/utility.glsl'

// Vertex shader for instanced mesh rendering
export const INSTANCED_VERTEX_SHADER = /*glsl*/ `
uniform sampler2D positionTex;
uniform sampler2D velocityTex;
uniform float time;
uniform float sizeMultiplier;
uniform float instanceCount;

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

void main() {
  // Calculate UV from instance ID (WebGL 2.0)
  float instanceId = float(gl_InstanceID);
  float textureSize = floor(sqrt(instanceCount));
  float u = (mod(instanceId, textureSize) + 0.5) / textureSize;
  float v = (floor(instanceId / textureSize) + 0.5) / textureSize;
  vec2 uv = vec2(u, v);
  
  vec4 pos = texture2D(positionTex, uv);
  vec4 vel = texture2D(velocityTex, uv);
  
  // Get random rotation based on instance ID
  vec3 randomRot = randomRotationFromId(instanceId);
  
  // Create rotation matrix from random euler angles
  mat4 rotMat = eulerAnglesToRotationMatrix(randomRot);
  
  // Scale the base geometry position
  vec3 lpos = position * sizeMultiplier;
  
  // Apply rotation to local position
  vec3 rotatedPos = (rotMat * vec4(lpos, 1.0)).xyz;
  
  // Add particle world position from texture
  vec3 newPos = rotatedPos + pos.xyz;
  
  // Transform by instance matrix (identity in our case, but needed for CSM)
  vec4 instancePos = instanceMatrix * vec4(newPos, 1.0);
  
  // CSM requires full transformation chain
  csm_PositionRaw = projectionMatrix * modelViewMatrix * instancePos;
}
`;

// Fragment shader for instanced mesh
export const INSTANCED_FRAGMENT_SHADER = /*glsl*/ `

void main() {
  csm_DiffuseColor = vec4(0.2, 0.2, 0.2, 1.0);
}
`;

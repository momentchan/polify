import blending from '@packages/r3f-gist/shaders/cginc/math/blending.glsl'

export const shardMirrorVertexShader = /* glsl */`
  varying vec3 vWpos;
  varying vec3 vWnorml;
  varying vec2 vUv;
  void main(){
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWpos = wp.xyz;
    vWnorml = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
  }
`

export const shardMirrorFragmentShader = /* glsl */`
  ${blending}

  precision highp float;
  varying vec3 vWpos;
  varying vec3 vWnorml;
  varying vec2 vUv;
  uniform vec3 uCamPos;

  uniform vec3 uCenter;
  uniform vec3 uU;
  uniform vec3 uV;
  uniform vec3 uN;
  uniform vec2 uSize;

  uniform sampler2D uMap;
  uniform float uBlurAmount;
  uniform float uMappingScale;

  uniform float uFresnelPower;
  uniform float uFresnelIntensity;
  uniform vec3 uFresnelColor;
  uniform sampler2D uScratchTex;
  uniform float uScratchBlend;

  void main() {
    vec3 view = normalize(uCamPos - vWpos);
    vec3 nml = normalize(vWnorml);
    vec3 refect = reflect(view, nml);

    float fresnel = pow(1.0 - max(dot(view, nml), 0.0), uFresnelPower);
    vec3 fresnelColor = uFresnelColor * fresnel * uFresnelIntensity;

    float denom = dot(refect, uN);

    float t = dot(uCenter - vWpos, uN) / denom;

    float denomFade = smoothstep(0.01, 0.04, abs(denom));
    float frontFade = step(0.0, t);

    vec3 hit = vWpos + t * refect;
    vec3 rel = hit - uCenter;

    float x = dot(rel, uU);
    float y = dot(rel, uV);

    // Apply mapping scale: > 1.0 zooms in (closer), < 1.0 zooms out (farther)
    vec2 uv = vec2(x * uMappingScale / uSize.x + 0.5, y * uMappingScale / uSize.y + 0.5);

    float inset = 0.0;
    vec2 d = vec2(
      min(uv.x - 0.0, 1.0 - uv.x),
      min(uv.y - 0.0, 1.0 - uv.y)
    );
    float edgeFade = smoothstep(inset, inset + 0.015, min(d.x, d.y));

    // Blur sampling
    vec4 col;
    if (uBlurAmount > 0.0) {
      vec2 texelSize = vec2(1.0 / uSize.x, 1.0 / uSize.y) * uBlurAmount;
      
      // Sample 3x3 grid around the current pixel
      vec4 s0 = texture2D(uMap, uv + vec2(-texelSize.x, -texelSize.y));
      vec4 s1 = texture2D(uMap, uv + vec2(0.0, -texelSize.y));
      vec4 s2 = texture2D(uMap, uv + vec2(texelSize.x, -texelSize.y));
      vec4 s3 = texture2D(uMap, uv + vec2(-texelSize.x, 0.0));
      vec4 s4 = texture2D(uMap, uv);
      vec4 s5 = texture2D(uMap, uv + vec2(texelSize.x, 0.0));
      vec4 s6 = texture2D(uMap, uv + vec2(-texelSize.x, texelSize.y));
      vec4 s7 = texture2D(uMap, uv + vec2(0.0, texelSize.y));
      vec4 s8 = texture2D(uMap, uv + vec2(texelSize.x, texelSize.y));
      
      // Box blur (equal weights)
      col = (s0 + s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8) / 9.0;
    } else {
      col = texture2D(uMap, uv);
    }
    
    float alpha = denomFade * edgeFade * col.a;

    col *= edgeFade;
    col.rgb += fresnelColor;

    vec4 scratch = texture2D(uScratchTex, vUv);

    float gray = dot(scratch.rgb, vec3(0.299, 0.587, 0.114));
    vec3 scratchGray = vec3(gray);

    col.rgb = mix(col.rgb, BlendScreen(col.rgb, scratchGray), uScratchBlend);

    csm_DiffuseColor = vec4(col.rgb, 1.0);
  }
`
